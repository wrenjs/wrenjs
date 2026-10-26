import type { ServerResponse } from "node:http";
import type { WrenResponseParts } from "../ssr/response.ts";
import { responseParts } from "../../utils.ts";

const noop = () => {};
const uncork = (res: ServerResponse) => res.uncork();

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

export const sendResponse = (
  res: ServerResponse,
  response: Response,
): Promise<ServerResponse> | ServerResponse => {
  const parts = responseParts(response);
  return parts ? writeParts(res, parts) : writeResponse(res, response);
};
