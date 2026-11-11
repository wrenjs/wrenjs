import { WINDOW_KEY_FLIGHT_DATA } from "#shared/constants.ts";

const encoder = new TextEncoder();
const TRAILER = "</body></html>";
const trailerBytes = encoder.encode(TRAILER);
const BINARY_SLICE = 0x8000;
const PUSH = `(self[${JSON.stringify(WINDOW_KEY_FLIGHT_DATA)}]||=[]).push(`;

const nextTurn: (callback: () => void) => unknown =
	typeof setImmediate === "function" ? setImmediate : (callback) => setTimeout(callback, 0);

const withoutTrailer = (chunk: Uint8Array): Uint8Array => {
	const offset = chunk.length - trailerBytes.length;
	if (offset < 0) {
		return chunk;
	}
	for (let i = 0; i < trailerBytes.length; i++) {
		if (chunk[offset + i] !== trailerBytes[i]) {
			return chunk;
		}
	}
	return chunk.subarray(0, offset);
};

const toBinaryString = (bytes: Uint8Array) => {
	let binary = "";
	for (let i = 0; i < bytes.length; i += BINARY_SLICE) {
		binary += String.fromCharCode(...bytes.subarray(i, i + BINARY_SLICE));
	}
	return binary;
};

const pushScript = (data: string) => {
	const script = `${PUSH}${data})`;
	return `<script>${script.replaceAll("<!--", "<\\!--").replaceAll(/<\/(script)/gi, "</\\$1")}</script>`;
};

// A chunk that is not valid UTF-8 on its own, such as binary data, travels as base64.
const flightScript = (decoder: TextDecoder, chunk: Uint8Array) => {
	try {
		return pushScript(JSON.stringify(decoder.decode(chunk, { stream: true })));
	} catch {
		const base64 = JSON.stringify(btoa(toBinaryString(chunk)));
		return pushScript(`Uint8Array.from(atob(${base64}), m => m.codePointAt(0))`);
	}
};

/**
 * Splits a Flight stream between SSR and the document: `flight` feeds the Flight client, and
 * piping the rendered HTML through `html` embeds every Flight chunk for the browser to replay.
 */
export const injectRSCPayload = (rscStream: ReadableStream<Uint8Array>) => {
	const decoder = new TextDecoder("utf-8", { fatal: true });
	const flightDone = Promise.withResolvers<void>();
	const buffered: Uint8Array[] = [];
	let flightController!: ReadableStreamDefaultController<Uint8Array>;
	let htmlController!: TransformStreamDefaultController<Uint8Array>;
	let scripts = "";
	let scheduled = false;
	// Scripts can only follow HTML, so they are held back until the first of it was sent.
	let started = false;

	const flushHtml = () => {
		for (const chunk of buffered) {
			const stripped = withoutTrailer(chunk);
			if (stripped.length > 0) {
				htmlController.enqueue(stripped);
			}
		}
		buffered.length = 0;
		scheduled = false;
		started = true;
	};
	const flushScripts = (suffix = "") => {
		const markup = scripts + suffix;
		scripts = "";
		if (markup) {
			htmlController.enqueue(encoder.encode(markup));
		}
	};
	// The response failing or being cancelled must not disturb the Flight stream SSR is reading.
	const respond = (script: string) => {
		scripts += script;
		try {
			if (started) {
				flushScripts();
			}
		} catch (error) {
			htmlController.error(error);
		}
	};

	const pump = async () => {
		const reader = rscStream.getReader();
		for (;;) {
			// oxlint-disable-next-line no-await-in-loop
			const { done, value } = await reader.read();
			if (done) {
				break;
			}
			flightController.enqueue(value);
			respond(flightScript(decoder, value));
		}
		flightController.close();
		const remaining = decoder.decode();
		respond(remaining && pushScript(JSON.stringify(remaining)));
	};
	const fail = (error: unknown) => {
		flightController.error(error);
		htmlController.error(error);
	};

	const streams = {
		flight: new ReadableStream<Uint8Array>({
			start(controller) {
				flightController = controller;
			},
		}),
		html: new TransformStream<Uint8Array, Uint8Array>({
			async flush() {
				await flightDone.promise;
				if (scheduled) {
					flushHtml();
				}
				flushScripts(TRAILER);
			},
			start(controller) {
				htmlController = controller;
			},
			// React writes one flush as several chunks, and a script must not land between them. The
			// chunks of a flush all arrive within a turn, so they are forwarded together on the next.
			transform(chunk) {
				buffered.push(chunk);
				if (scheduled) {
					return;
				}
				scheduled = true;
				nextTurn(() => {
					if (!scheduled) {
						return;
					}
					try {
						flushHtml();
						flushScripts();
					} catch (error) {
						htmlController.error(error);
					}
				});
			},
		}),
	};
	void pump().catch(fail).finally(flightDone.resolve);
	return streams;
};
