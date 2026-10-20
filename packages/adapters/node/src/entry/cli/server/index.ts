import type { IncomingMessage, ServerResponse } from "node:http";
import { createReadStream } from "node:fs";
import { pipeline } from "node:stream";
import { fetch } from "virtual:wrenjs-fetch";
import STATIC_ASSETS from "virtual:wrenjs-static-assets";
import type { WrenResponseParts } from "#shared/entry/ssr/response.ts";
import { isRequestAbortError, toRequestInput } from "#shared/entry/node/request.ts";
import { responseParts } from "#shared/utils.ts";

const CLIENT_DIR = `${import.meta.dirname}/client`;
const { createServer } = process.getBuiltinModule("node:http");

const noop = () => {};
const uncork = (res: ServerResponse) => res.uncork();
const logStreamError = (error: NodeJS.ErrnoException | null) => {
  if (error && error.code !== "ERR_STREAM_PREMATURE_CLOSE") console.error(error);
};

const nodeServer = createServer((req, res) => {
  requestHandler(req, res).catch((err) => {
    if (isRequestAbortError(req, err)) return;
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
  const method = req.method ?? "GET";
  const query = url.indexOf("?");
  const pathname = query === -1 ? url : url.slice(0, query);

  if ((method === "GET" || method === "HEAD") && Object.hasOwn(STATIC_ASSETS, pathname)) {
    const [file, headers] = STATIC_ASSETS[pathname];
    res.writeHead(200, headers);
    if (method === "HEAD") return res.end();
    return pipeline(createReadStream(`${CLIENT_DIR}/${file}`), res, logStreamError);
  }

  const response = await fetch(toRequestInput(req, url));
  const parts = responseParts(response);
  return parts ? writeParts(res, parts) : writeResponse(res, response);
};

const PORT = process.env.PORT ?? "4173";
nodeServer.listen(PORT, () => {
  console.info(`Server is listening on port ${PORT}`);
});

const writeParts = (res: ServerResponse, { body, headers, status }: WrenResponseParts) => {
  const raw: string[] = [];
  if (headers instanceof Headers) {
    headers.delete("content-length");
    headers.forEach((value, name) => raw.push(name, value));
  } else {
    for (const name in headers) raw.push(name, headers[name]);
  }
  if (body !== null && typeof body !== "string") return writeBody(res.writeHead(status, raw), body);
  raw.push("Content-Length", body ? String(Buffer.byteLength(body)) : "0");
  return res.writeHead(status, raw).end(body);
};

const writeResponse = (res: ServerResponse, { body, headers, status }: Response) => {
  const raw: string[] = [];
  headers.forEach((value, name) => raw.push(name, value));
  res.writeHead(status, raw);
  return body ? writeBody(res, body) : res.end();
};

const waitForDrain = (res: ServerResponse) =>
  new Promise<void>((resolve) => {
    const done = () => {
      res.off("drain", done);
      res.off("close", done);
      resolve();
    };
    res.on("drain", done);
    res.on("close", done);
  });

const writeBody = async (res: ServerResponse, body: ReadableStream<Uint8Array>) => {
  const reader = body.getReader();
  const onClose = () => void reader.cancel().catch(noop);
  res.once("close", onClose);
  if (res.destroyed) onClose();

  try {
    while (!res.destroyed) {
      // oxlint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read();
      if (done || res.destroyed) break;
      if (!res.writableCorked) {
        res.cork();
        process.nextTick(uncork, res);
      }
      // oxlint-disable-next-line no-await-in-loop
      if (!res.write(value)) await waitForDrain(res);
    }
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
