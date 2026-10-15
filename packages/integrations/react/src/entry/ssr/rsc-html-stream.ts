import { WINDOW_KEY_FLIGHT_DATA } from "#shared/constants.ts";

const encoder = new TextEncoder();
const trailer = "</body></html>";
const trailerBytes = encoder.encode(trailer);
const BINARY_SLICE = 0x8000;

const nextTurn: (callback: () => void) => unknown =
  typeof setImmediate === "function" ? setImmediate : (callback) => setTimeout(callback, 0);

const withoutTrailer = (chunk: Uint8Array): Uint8Array => {
  const offset = chunk.length - trailerBytes.length;
  if (offset < 0) return chunk;
  for (let i = 0; i < trailerBytes.length; i++) {
    if (chunk[offset + i] !== trailerBytes[i]) return chunk;
  }
  return chunk.subarray(0, offset);
};

export const injectRSCPayload = (rscStream: AsyncIterable<Uint8Array>) => {
  const flightData = Promise.withResolvers<void>();
  let startedRSC = false;

  const buffered: Uint8Array[] = [];
  let scheduled = false;
  function flushBufferedChunks(controller: TransformStreamDefaultController<Uint8Array>) {
    for (const chunk of buffered) {
      const stripped = withoutTrailer(chunk);
      if (stripped.length > 0) controller.enqueue(stripped);
    }

    buffered.length = 0;
    scheduled = false;
  }

  return new TransformStream({
    async flush(controller) {
      await flightData.promise;

      if (scheduled) flushBufferedChunks(controller);
      controller.enqueue(encoder.encode(trailer));
    },
    transform(chunk, controller) {
      buffered.push(chunk);
      if (scheduled) {
        return;
      }

      scheduled = true;
      nextTurn(() => {
        if (!scheduled) return;
        try {
          flushBufferedChunks(controller);
        } catch (e) {
          controller.error(e);
          flightData.resolve();
          return;
        }
        if (!startedRSC) {
          startedRSC = true;
          void writeRSCStream(rscStream, controller).then(flightData.resolve, (err: unknown) => {
            controller.error(err);
            flightData.resolve();
          });
        }
      });
    },
  });
};

function escapeScript(script: string) {
  return script.replaceAll("<!--", "<\\!--").replaceAll(/<\/(script)/gi, "</\\$1");
}

function toBinaryString(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += BINARY_SLICE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BINARY_SLICE));
  }
  return binary;
}

function writeChunk(chunk: string, controller: TransformStreamDefaultController<Uint8Array>) {
  const payload = `(self[${JSON.stringify(WINDOW_KEY_FLIGHT_DATA)}]||=[]).push(${chunk})`;
  controller.enqueue(encoder.encode(`<script>${escapeScript(payload)}</script>`));
}

async function writeRSCStream(
  rscStream: AsyncIterable<Uint8Array>,
  controller: TransformStreamDefaultController<Uint8Array>,
) {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  for await (const chunk of rscStream) {
    try {
      writeChunk(JSON.stringify(decoder.decode(chunk, { stream: true })), controller);
    } catch {
      const base64 = JSON.stringify(btoa(toBinaryString(chunk)));
      writeChunk(`Uint8Array.from(atob(${base64}), m => m.codePointAt(0))`, controller);
    }
  }

  const remaining = decoder.decode();
  if (remaining.length) {
    writeChunk(JSON.stringify(remaining), controller);
  }
}
