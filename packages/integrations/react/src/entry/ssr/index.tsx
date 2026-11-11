import type { ReactNode } from "react";

import { createFromReadableStream } from "@vitejs/plugin-rsc/react/ssr";
import { getClientEntryUrl } from "@vitejs/plugin-rsc/ssr";
import { preloadModule } from "react-dom";
import { renderToReadableStream } from "react-dom/server";

import { WINDOW_KEY_HYDRATE } from "#shared/constants.ts";

import { injectRSCPayload } from "./rsc-html-stream.ts";

const ModulePreloads = ({ children, hrefs }: { children: ReactNode; hrefs: string[] }) => {
	for (const href of hrefs) preloadModule(href);
	return children;
};

export async function renderToHtml(
	rscStream: ReadableStream<Uint8Array>,
	options: {
		hydrate?: boolean;
		onError?: (error: unknown) => void;

		preloads?: string[];

		scripts?: (() => Promise<string> | string) | string[];
	} = {},
): Promise<ReadableStream<Uint8Array>> {
	const hydrate = options.hydrate !== false;
	const payload = hydrate ? injectRSCPayload(rscStream) : undefined;

	const bootstrap = (mode: "hydrate" | "render") =>
		hydrate
			? `self.${WINDOW_KEY_HYDRATE}=${JSON.stringify(mode)};import(${JSON.stringify(getClientEntryUrl())})`
			: undefined;
	const { preloads, scripts } = options;
	const bootstrapModules = Array.isArray(scripts) && scripts.length > 0 ? scripts : undefined;
	let htmlStream: ReadableStream<Uint8Array>;
	try {
		// Awaited so that the render starts with the root instead of suspending on it first.
		const root = await createFromReadableStream<ReactNode>(payload?.flight ?? rscStream);
		htmlStream = await renderToReadableStream(
			preloads?.length ? <ModulePreloads hrefs={preloads}>{root}</ModulePreloads> : root,
			{
				bootstrapModules,
				bootstrapScriptContent: bootstrap("hydrate"),
				onError: options.onError,
			},
		);
	} catch {
		htmlStream = await renderToReadableStream(
			<html>
				<body>
					<noscript>Internal Server Error: SSR failed</noscript>
				</body>
			</html>,
			{
				bootstrapModules,
				bootstrapScriptContent: bootstrap("render"),
			},
		);
	}
	let responseStream = htmlStream;
	if (import.meta.env.DEV && typeof scripts === "function") {
		responseStream = responseStream.pipeThrough(appendMarkup(scripts));
	}
	return payload ? responseStream.pipeThrough(payload.html) : responseStream;
}

const appendMarkup = (
	markup: () => Promise<string> | string,
): TransformStream<Uint8Array, Uint8Array> =>
	new TransformStream({
		async flush(controller) {
			const text = await markup();
			if (text) controller.enqueue(new TextEncoder().encode(text));
		},
	});
