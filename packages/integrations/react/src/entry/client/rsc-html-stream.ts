import { WINDOW_KEY_FLIGHT_DATA } from "#shared/constants.ts";
declare global {
  interface Window {
    [WINDOW_KEY_FLIGHT_DATA]?: Array<string | Uint8Array>;
  }
}

const encoder = new TextEncoder();
let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
export const rscStream = new ReadableStream({
  start(controller) {
    if (typeof window === "undefined") {
      return;
    }
    const enqueue = (chunk: string | Uint8Array) =>
      controller.enqueue(typeof chunk === "string" ? encoder.encode(chunk) : chunk);
    const data = (window[WINDOW_KEY_FLIGHT_DATA] ||= []);
    data.forEach(enqueue);
    data.length = 0;
    data.push = (chunk) => {
      enqueue(chunk);
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
