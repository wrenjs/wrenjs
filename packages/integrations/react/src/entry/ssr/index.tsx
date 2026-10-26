import { createFromReadableStream } from "@vitejs/plugin-rsc/react/ssr";
import { getClientEntryUrl } from "@vitejs/plugin-rsc/ssr";
import { renderToReadableStream } from "react-dom/server";
import { WINDOW_KEY_HYDRATE } from "#shared/constants.ts";
import { injectRSCPayload } from "./rsc-html-stream.ts";

export async function renderToHtml(
  rscStream: ReadableStream<Uint8Array>,
  options: {
    hydrate?: boolean;
    onError?: (error: unknown) => void;

    scripts?: (() => Promise<string> | string) | string[];
  } = {},
): Promise<ReadableStream<Uint8Array>> {
  const hydrate = options.hydrate !== false;
  let stream1 = rscStream;
  let stream2: ReadableStream<Uint8Array> | undefined;
  if (hydrate) [stream1, stream2] = rscStream.tee();

  const bootstrap = (mode: "hydrate" | "render") =>
    hydrate
      ? `self.${WINDOW_KEY_HYDRATE}=${JSON.stringify(mode)};import(${JSON.stringify(getClientEntryUrl())})`
      : undefined;
  const { scripts } = options;
  const bootstrapModules = Array.isArray(scripts) && scripts.length > 0 ? scripts : undefined;
  let htmlStream: ReadableStream<Uint8Array>;
  try {
    htmlStream = await renderToReadableStream(createFromReadableStream(stream1), {
      bootstrapModules,
      bootstrapScriptContent: bootstrap("hydrate"),
      onError: options.onError,
    });
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
  if (stream2) responseStream = responseStream.pipeThrough(injectRSCPayload(stream2));

  return responseStream;
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
