import { WINDOW_KEY_FLIGHT_DATA } from "#shared/constants.ts";

const encoder = new TextEncoder();
const trailer = "</body></html>";

/**
 * Runs `callback` after the current event-loop turn. `setTimeout(fn, 0)` would do, but
 * Node clamps it to 1ms, which every response would pay before its first flush.
 */
const nextTurn: (callback: () => void) => unknown =
  typeof setImmediate === "function" ? setImmediate : (callback) => setTimeout(callback, 0);

export const injectRSCPayload = (
  rscStream: AsyncIterable<Uint8Array>,
  options?: { nonce?: string },
) => {
  let decoder = new TextDecoder();
  let resolveFlightDataPromise!: () => void;
  let flightDataPromise = new Promise<void>((resolve) => {
    resolveFlightDataPromise = resolve;
  });
  let startedRSC = false;
  let nonce = options && typeof options.nonce === "string" ? options.nonce : undefined;

  // Buffer all HTML chunks enqueued during the current tick of the event loop (roughly)
  // and write them to the output stream all at once. This ensures that we don't generate
  // invalid HTML by injecting RSC in between two partial chunks of HTML.
  let buffered: Uint8Array[] = [];
  let scheduled = false;
  function flushBufferedChunks(controller: TransformStreamDefaultController<Uint8Array>) {
    for (let chunk of buffered) {
      let buf = decoder.decode(chunk, { stream: true });
      if (buf.endsWith(trailer)) {
        buf = buf.slice(0, -trailer.length);
      }
      controller.enqueue(encoder.encode(buf));
    }

    let remaining = decoder.decode();
    if (remaining.length) {
      if (remaining.endsWith(trailer)) {
        remaining = remaining.slice(0, -trailer.length);
      }
      controller.enqueue(encoder.encode(remaining));
    }

    buffered.length = 0;
    scheduled = false;
  }

  return new TransformStream({
    async flush(controller) {
      await flightDataPromise;
      // A scheduled flush may still be pending; writing it now makes it a no-op later.
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
          resolveFlightDataPromise();
          return;
        }
        if (!startedRSC) {
          startedRSC = true;
          void writeRSCStream(rscStream, controller, nonce).then(
            resolveFlightDataPromise,
            (err: unknown) => {
              controller.error(err);
              resolveFlightDataPromise();
            },
          );
        }
      });
    },
  });
};

// Escape closing script tags and HTML comments in JS content.
// https://www.w3.org/TR/html52/semantics-scripting.html#restrictions-for-contents-of-script-elements
// Avoid replacing </script with <\/script as it would break the following valid JS: 0</script/ (i.e. regexp literal).
// Instead, escape the s character.
function escapeScript(script: string) {
  return script.replace(/<!--/g, "<\\!--").replace(/<\/(script)/gi, "</\\$1");
}

function writeChunk(
  chunk: string,
  controller: TransformStreamDefaultController<Uint8Array>,
  nonce: string | undefined,
) {
  let nonceAttribute = nonce ? ` nonce="${nonce}"` : "";
  let payload = `(self[${JSON.stringify(WINDOW_KEY_FLIGHT_DATA)}]||=[]).push(${chunk})`;
  controller.enqueue(
    encoder.encode("<script" + nonceAttribute + ">" + escapeScript(payload) + "</script>"),
  );
}

async function writeRSCStream(
  rscStream: AsyncIterable<Uint8Array>,
  controller: TransformStreamDefaultController<Uint8Array>,
  nonce: string | undefined,
) {
  let decoder = new TextDecoder("utf-8", { fatal: true });
  for await (let chunk of rscStream) {
    // Try decoding the chunk to send as a string.
    // If that fails (e.g. binary data that is invalid unicode), write as base64.
    try {
      writeChunk(JSON.stringify(decoder.decode(chunk, { stream: true })), controller, nonce);
    } catch {
      let base64 = JSON.stringify(btoa(String.fromCodePoint(...chunk)));
      writeChunk(`Uint8Array.from(atob(${base64}), m => m.codePointAt(0))`, controller, nonce);
    }
  }

  let remaining = decoder.decode();
  if (remaining.length) {
    writeChunk(JSON.stringify(remaining), controller, nonce);
  }
}
