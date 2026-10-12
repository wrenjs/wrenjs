import type { IncomingMessage, ServerResponse } from "node:http";
import { once } from "node:events";
import { createServer } from "node:http";
import { fetch } from "virtual:wrenjs-fetch";
import { STATIC_ASSETS_CLIENT } from "#/entry/cli/constants.ts";
import "./collect.ts";

const noop = () => {};
const nodeServer = createServer((req, res) => {
  requestHandler(req, res).catch((err) => {
    console.error(err);

    if (res.destroyed) return;
    if (res.headersSent) {
      res.destroy();
    } else {
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });
});

const requestHandler = async (req: IncomingMessage, res: ServerResponse) => {
  const url = req.url ?? "";
  const hasQuery = url.includes("?");
  const pathname = hasQuery ? url.slice(0, url.indexOf("?")) : url;

  const preFile = STATIC_ASSETS_CLIENT.get(pathname);
  if (preFile && (req.method === "GET" || req.method === "HEAD")) {
    res.writeHead(200, preFile.headers);
    return res.end(req.method === "HEAD" ? undefined : preFile.body);
  }

  const method = req.method ?? "GET";
  let request: Request | undefined;
  const response = await fetch({
    headers: {
      get(name: string) {
        const header = req.headers[name.toLowerCase()];
        if (header === undefined) return null;
        return typeof header === "string" ? header : header.join(", ");
      },
    },
    method,
    // Only built when app code (loaders, proxies, API handlers, actions) needs a real Request.
    toRequest() {
      if (request) return request;

      const headers: [string, string][] = [];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        headers.push([req.rawHeaders[i], req.rawHeaders[i + 1]]);
      }

      const init: RequestInit & { duplex?: "half" } = { headers, method, signal: req.signal };
      if (method !== "GET" && method !== "HEAD") {
        // Node accepts async-iterable bodies, but DOM BodyInit typings do not.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        init.body = req as unknown as BodyInit;
        init.duplex = "half";
      }

      const origin = `http://${req.headers.host ?? "localhost"}`;
      request = new Request(url.startsWith("/") ? origin + url : new URL(url, origin), init);
      return request;
    },
    url,
  });
  return wrenResHandler(res, response);
};

const PORT = process.env.PORT ?? "4173";
nodeServer.listen(PORT, () => {
  console.info(`Server is listening on port ${PORT}`);
});

const wrenResHandler = async (res: ServerResponse, wrenResponse: Response) => {
  const headers: Record<string, string | string[]> = Object.fromEntries(wrenResponse.headers);
  // `Object.fromEntries` keeps only the last `Set-Cookie`; restore all of them.
  const cookies = wrenResponse.headers.getSetCookie();
  if (cookies.length > 1) headers["set-cookie"] = cookies;
  res.writeHead(wrenResponse.status, headers);
  if (!wrenResponse.body) {
    res.end();
    return res;
  }

  const reader = wrenResponse.body.getReader();
  const abort = new AbortController();

  const onClose = () => {
    abort.abort();
    void reader.cancel().catch(noop);
  };

  res.once("close", onClose);
  if (res.destroyed) onClose();

  try {
    const consume = async () => {
      if (res.destroyed) return;
      const { done, value } = await reader.read();
      if (done || res.destroyed) return;

      // Write bytes directly; pause when Node's buffer fills.
      if (!res.write(value)) {
        await once(res, "drain", { signal: abort.signal });
      }
      await consume();
    };

    await consume();

    if (!res.destroyed) res.end();
  } catch (error) {
    void reader.cancel(error).catch(noop);
    if (!res.destroyed) throw error;
  } finally {
    res.off("close", onClose);
    reader.releaseLock();
  }

  return res;
};
