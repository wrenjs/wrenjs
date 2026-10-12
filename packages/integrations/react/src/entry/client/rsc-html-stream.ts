import { WINDOW_KEY_FLIGHT_DATA } from "#shared/constants.ts";
declare global {
  interface Window {
    [WINDOW_KEY_FLIGHT_DATA]?: Array<string | Uint8Array>;
  }
}

let encoder = new TextEncoder();
let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
export let rscStream = new ReadableStream({
  start(controller) {
    if (typeof window === "undefined") {
      return;
    }
    let handleChunk = (chunk: string | Uint8Array) => {
      if (typeof chunk === "string") {
        controller.enqueue(encoder.encode(chunk));
      } else {
        controller.enqueue(chunk);
      }
    };
    window[WINDOW_KEY_FLIGHT_DATA] ||= [];
    window[WINDOW_KEY_FLIGHT_DATA].forEach(handleChunk);
    window[WINDOW_KEY_FLIGHT_DATA].length = 0;
    window[WINDOW_KEY_FLIGHT_DATA].push = (chunk) => {
      handleChunk(chunk);
      return 0;
    };
    streamController = controller;
  },
});

if (typeof document !== "undefined" && document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    streamController?.close();
  });
} else {
  streamController?.close();
}
