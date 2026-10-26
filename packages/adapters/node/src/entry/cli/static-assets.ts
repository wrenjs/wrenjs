import type { StaticAsset } from "virtual:wrenjs-static-assets";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { brotliCompress, constants, gzip } from "node:zlib";
import { encodePath, forEachLimit, sortedRecord } from "#shared/cli/utils.ts";
import {
  ASSET_CACHE_CONTROL,
  EXT_FLT,
  EXT_FLT_UNDER,
  EXT_HTML,
  EXT_INDEX_HTML,
  EXT_MAP,
  MIME,
  PAGE_CACHE_CONTROL,
  UTF_8,
} from "./constants.ts";

type Encoding = keyof NonNullable<StaticAsset["encodings"]>;

const TEXT_TYPE_RE = /^text\/|[/+](?:json|xml)$/;
const COMPRESSIBLE_BINARY_TYPES: ReadonlySet<string> = new Set([
  "application/wasm",
  "font/otf",
  "font/ttf",
  "image/bmp",
  "image/x-icon",
]);
const MIN_COMPRESSIBLE_SIZE = 1024;
const CONCURRENCY = 16;

const brotli = promisify(brotliCompress);
const gzipped = promisify(gzip);

const compressors = (
  isBuildAsset: boolean,
): readonly [Encoding, string, (data: Buffer) => Promise<Buffer>][] => [
  [
    "br",
    ".br",
    (data) =>
      brotli(data, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: isBuildAsset ? 10 : 9,
          [constants.BROTLI_PARAM_SIZE_HINT]: data.length,
        },
      }),
  ],
  ["gzip", ".gz", (data) => gzipped(data, { level: constants.Z_BEST_COMPRESSION })],
];

const listFiles = (directory: string) =>
  readdir(directory, { recursive: true, withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    },
  );

const isCompressible = (type: string, extension: string, size: number) =>
  size >= MIN_COMPRESSIBLE_SIZE &&
  extension !== EXT_MAP &&
  (TEXT_TYPE_RE.test(type) || COMPRESSIBLE_BINARY_TYPES.has(type));

const describeAsset = async (
  path: string,
  file: string,
  isBuildAsset: boolean,
  existing: ReadonlySet<string>,
) => {
  const extension = extname(file);
  const { mtimeMs, size } = await stat(path);
  const type = MIME[extension] ?? "application/octet-stream";
  const headers = [
    "Content-Type",
    TEXT_TYPE_RE.test(type) ? `${type};${UTF_8}` : type,
    "Cache-Control",
    extension === EXT_HTML || extension === EXT_FLT ? PAGE_CACHE_CONTROL : ASSET_CACHE_CONTROL,
  ];
  const etag = `W/"${size.toString(16)}-${Math.trunc(mtimeMs).toString(16)}"`;
  if (!isCompressible(type, extension, size)) {
    return { etag, file, headers, size } satisfies StaticAsset;
  }

  const data = await readFile(path);
  const variants = await Promise.all(
    compressors(isBuildAsset).map(async ([encoding, suffix, compress]) => {
      if (existing.has(file + suffix)) return undefined;
      const compressed = await compress(data);
      if (compressed.length > size * 0.9) return undefined;
      await writeFile(path + suffix, compressed);
      return [encoding, [file + suffix, compressed.length] as const] as const;
    }),
  );
  const encodings: NonNullable<StaticAsset["encodings"]> = Object.fromEntries(
    variants.filter((variant) => variant !== undefined),
  );
  if (Object.keys(encodings).length > 0) headers.push("Vary", "Accept-Encoding");
  return { encodings, etag, file, headers, size } satisfies StaticAsset;
};

export const writeStaticAssets = async (
  clientDir: string,
  outFile: string,
  assetsDir: string,
): Promise<void> => {
  const segments = assetsDir.split("/").filter(Boolean).join("/");
  // Keys are compared with raw request pathnames, which browsers percent-encode.
  const assetsPrefix = segments ? encodePath(`/${segments}/`) : null;
  const files = (await listFiles(clientDir))
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const path = resolve(entry.parentPath, entry.name);
      return { file: relative(clientDir, path).split(sep).join("/"), path };
    });
  const existing = new Set(files.map(({ file }) => file));
  const assets = new Map<string, StaticAsset>();
  await forEachLimit(files, CONCURRENCY, async ({ file, path }) => {
    const url = encodePath(`/${file}`);
    const isBuildAsset = assetsPrefix !== null && url.startsWith(assetsPrefix);
    const asset = await describeAsset(path, file, isBuildAsset, existing);
    assets.set(url, asset);
    if (extname(file) === EXT_HTML) {
      const clean = url.endsWith(EXT_INDEX_HTML)
        ? url.slice(0, -EXT_INDEX_HTML.length) || "/"
        : url.slice(0, -EXT_HTML.length);
      assets.set(clean, asset);
      if (clean !== "/") assets.set(`${clean}/`, asset);
    }
    if (url.endsWith(EXT_FLT_UNDER) && url !== `/${EXT_FLT_UNDER}`) {
      assets.set(`${url.slice(0, -EXT_FLT_UNDER.length)}/${EXT_FLT_UNDER}`, asset);
    }
  });
  await writeFile(
    outFile,
    `export default ${JSON.stringify(sortedRecord([...assets]))};\nexport const ASSETS_PREFIX = ${JSON.stringify(assetsPrefix)};\n`,
  );
};
