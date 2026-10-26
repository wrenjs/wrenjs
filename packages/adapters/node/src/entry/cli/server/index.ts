import type { IncomingMessage, ServerResponse } from "node:http";
import type { StaticAsset } from "virtual:wrenjs-static-assets";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { pipeline } from "node:stream";
import { fetch } from "virtual:wrenjs-fetch";
import STATIC_ASSETS, { ASSETS_PREFIX } from "virtual:wrenjs-static-assets";
import { isRequestAbortError, toRequestInput } from "#shared/entry/node/request.ts";
import { sendResponse } from "#shared/entry/node/response.ts";

type Encoding = keyof NonNullable<StaticAsset["encodings"]>;

interface Representation {
  file: string;
  headers: string[];
  notModifiedHeaders: string[];
  /** ETag without its weak prefix: `If-None-Match` compares tags weakly. */
  opaqueTag: string;
  size: number;
}

const CLIENT_DIR = `${import.meta.dirname}/client`;
const { createServer } = process.getBuiltinModule("node:http");

const MAX_CACHED_FILE_SIZE = 64 * 1024;
const MAX_CACHE_SIZE = 64 * 1024 * 1024;
const ENCODINGS: readonly Encoding[] = ["br", "gzip"];

const logStreamError = (error: NodeJS.ErrnoException | null) => {
  if (error && error.code !== "ERR_STREAM_PREMATURE_CLOSE") console.error(error);
};

const hasExtension = (pathname: string) => pathname.lastIndexOf(".") > pathname.lastIndexOf("/");

const opaque = (tag: string) => (tag.startsWith("W/") ? tag.slice(2) : tag);

const fileCache = new Map<string, Buffer | Promise<Buffer>>();
let cachedBytes = 0;

const readSmallFile = (file: string, size: number): Buffer | Promise<Buffer> => {
  const cached = fileCache.get(file);
  if (cached) return cached;
  const pending = readFile(`${CLIENT_DIR}/${file}`);
  if (cachedBytes + size > MAX_CACHE_SIZE) return pending;
  cachedBytes += size;
  fileCache.set(file, pending);
  pending.then(
    (buffer) => fileCache.set(file, buffer),
    () => {
      fileCache.delete(file);
      cachedBytes -= size;
    },
  );
  return pending;
};

const sendFile = (res: ServerResponse, file: string, size: number) => {
  if (size > MAX_CACHED_FILE_SIZE) {
    return pipeline(createReadStream(`${CLIENT_DIR}/${file}`), res, logStreamError);
  }
  const body = readSmallFile(file, size);
  if (Buffer.isBuffer(body)) return res.end(body);
  return body.then((buffer) => (res.destroyed ? res : res.end(buffer)));
};

const qualityCache = new Map<string, Partial<Record<Encoding, number>>>();

const parseAcceptEncoding = (header: string) => {
  let qualities = qualityCache.get(header);
  if (qualities) return qualities;
  qualities = {};
  let wildcard: number | undefined;
  for (const part of header.split(",")) {
    const [token, ...params] = part.split(";");
    const name = token.trim().toLowerCase();
    let quality = 1;
    for (const param of params) {
      const [key, value] = param.split("=");
      if (key.trim().toLowerCase() === "q") quality = Number(value) || 0;
    }
    if (name === "*") wildcard = quality;
    else if (name === "br" || name === "gzip") qualities[name] = quality;
  }
  if (wildcard !== undefined) for (const encoding of ENCODINGS) qualities[encoding] ??= wildcard;
  // Header values are client-controlled, so only a bounded number of them is remembered.
  if (qualityCache.size < 64) qualityCache.set(header, qualities);
  return qualities;
};

const negotiate = (
  header: string | undefined,
  encodings: StaticAsset["encodings"],
): Encoding | undefined => {
  if (!header || !encodings) return undefined;
  const qualities = parseAcceptEncoding(header);
  let best: Encoding | undefined;
  let bestQuality = 0;
  for (const encoding of ENCODINGS) {
    const quality = qualities[encoding] ?? 0;
    if (encodings[encoding] && quality > bestQuality) {
      best = encoding;
      bestQuality = quality;
    }
  }
  return best;
};

const representations = new WeakMap<
  StaticAsset,
  Partial<Record<"identity" | Encoding, Representation>>
>();

const representation = (asset: StaticAsset, encoding: Encoding | undefined): Representation => {
  const key = encoding ?? "identity";
  let byEncoding = representations.get(asset);
  if (!byEncoding) {
    byEncoding = {};
    representations.set(asset, byEncoding);
  }
  let selected = byEncoding[key];
  if (!selected) {
    const [file, size] = (encoding && asset.encodings?.[encoding]) || [asset.file, asset.size];
    const tag = encoding ? `${asset.etag.slice(0, -1)}-${encoding}"` : asset.etag;
    const headers = [...asset.headers, "ETag", tag];
    // 304s only repeat the headers that let caches update their stored response.
    const notModifiedHeaders = ["ETag", tag];
    for (let index = 0; index < asset.headers.length; index += 2) {
      const name = asset.headers[index];
      if (name === "Cache-Control" || name === "Vary") {
        notModifiedHeaders.push(name, asset.headers[index + 1]);
      }
    }
    if (encoding) headers.push("Content-Encoding", encoding);
    headers.push("Content-Length", String(size));
    selected = { file, headers, notModifiedHeaders, opaqueTag: opaque(tag), size };
    byEncoding[key] = selected;
  }
  return selected;
};

const matchesTag = (header: string | undefined, opaqueTag: string) => {
  if (!header) return false;
  if (header.trim() === "*") return true;
  for (const candidate of header.split(",")) {
    if (opaque(candidate.trim()) === opaqueTag) return true;
  }
  return false;
};

const serveAsset = (req: IncomingMessage, res: ServerResponse, asset: StaticAsset) => {
  const { file, headers, notModifiedHeaders, opaqueTag, size } = representation(
    asset,
    negotiate(req.headers["accept-encoding"], asset.encodings),
  );
  if (matchesTag(req.headers["if-none-match"], opaqueTag)) {
    return res.writeHead(304, notModifiedHeaders).end();
  }
  res.writeHead(200, headers);
  return req.method === "HEAD" ? res.end() : sendFile(res, file, size);
};

const requestHandler = async (req: IncomingMessage, res: ServerResponse) => {
  const url = req.url ?? "";
  const method = req.method ?? "GET";
  if (method === "GET" || method === "HEAD") {
    const query = url.indexOf("?");
    const pathname = query === -1 ? url : url.slice(0, query);
    if (Object.hasOwn(STATIC_ASSETS, pathname))
      return serveAsset(req, res, STATIC_ASSETS[pathname]);
    // Missing build assets (e.g. stale hashes after a deploy) shouldn't render a catch-all page.
    if (ASSETS_PREFIX && pathname.startsWith(ASSETS_PREFIX) && hasExtension(pathname)) {
      return res.writeHead(404, ["Content-Length", "0"]).end();
    }
  }

  return sendResponse(res, await fetch(toRequestInput(req, url)));
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

const PORT = process.env.PORT ?? "4173";
nodeServer.listen(PORT, () => {
  console.info(`Server is listening on port ${PORT}`);
});
