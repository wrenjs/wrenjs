import { readdir, stat, writeFile } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import {
  ASSET_CACHE_CONTROL,
  EXT_FLT,
  EXT_FLT_UNDER,
  EXT_HTML,
  EXT_INDEX_HTML,
  MIME,
  PAGE_CACHE_CONTROL,
  UTF_8,
} from "./constants.ts";

type StaticAsset = [file: string, headers: string[]];

const TEXT_TYPE_RE = /^text\/|[/+](?:json|xml)$/;

const listFiles = (directory: string) =>
  readdir(directory, { recursive: true, withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    },
  );

export const writeStaticAssets = async (clientDir: string, outFile: string): Promise<void> => {
  const assets = new Map<string, StaticAsset>();
  const entries = await listFiles(clientDir);
  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isFile()) return;
      const path = resolve(entry.parentPath, entry.name);
      const file = relative(clientDir, path).split(sep).join("/");
      const url = `/${file}`;
      const { size } = await stat(path);
      const extension = extname(entry.name);
      const type = MIME[extension] ?? "application/octet-stream";
      const asset: StaticAsset = [
        file,
        [
          "Content-Type",
          TEXT_TYPE_RE.test(type) ? `${type};${UTF_8}` : type,
          "Content-Length",
          String(size),
          "Cache-Control",
          extension === EXT_HTML || extension === EXT_FLT
            ? PAGE_CACHE_CONTROL
            : ASSET_CACHE_CONTROL,
        ],
      ];
      assets.set(url, asset);
      if (extension === EXT_HTML) {
        const clean = url.endsWith(EXT_INDEX_HTML)
          ? url.slice(0, -EXT_INDEX_HTML.length) || "/"
          : url.slice(0, -EXT_HTML.length);
        assets.set(clean, asset);
        if (clean !== "/") assets.set(`${clean}/`, asset);
      }
      if (url.endsWith(EXT_FLT_UNDER) && url !== `/${EXT_FLT_UNDER}`) {
        assets.set(`${url.slice(0, -EXT_FLT_UNDER.length)}/${EXT_FLT_UNDER}`, asset);
      }
    }),
  );
  const sorted = Object.fromEntries([...assets].toSorted(([a], [b]) => (a < b ? -1 : 1)));
  await writeFile(outFile, `export default ${JSON.stringify(sorted)};\n`);
};
