import type { IncomingMessage } from "node:http";
import type { RequestInput } from "virtual:wrenjs-fetch";

export const isRequestAbortError = (req: IncomingMessage, error: unknown): boolean => {
  if (!req.signal?.aborted) return false;
  return error === req.signal.reason || (req.errored !== null && error === req.errored);
};

export const toRequestInput = (req: IncomingMessage, url = req.url ?? "/"): RequestInput => {
  const method = req.method ?? "GET";
  let request: Request | undefined;
  return {
    headers: {
      get(name: string) {
        const header = req.headers[name.toLowerCase()];
        if (header === undefined) return null;
        return typeof header === "string" ? header : header.join(", ");
      },
    },
    method,
    toRequest() {
      if (request) return request;
      req.signal?.throwIfAborted();

      const headers: [string, string][] = [];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        headers.push([req.rawHeaders[i], req.rawHeaders[i + 1]]);
      }

      const init: RequestInit & { duplex?: "half" } = { headers, method, signal: req.signal };
      if (method !== "GET" && method !== "HEAD") {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        init.body = req as unknown as BodyInit;
        init.duplex = "half";
      }

      const origin = `http://${req.headers.host ?? "localhost"}`;
      request = new Request(url.startsWith("/") ? origin + url : new URL(url, origin), init);
      return request;
    },
    url,
  };
};
