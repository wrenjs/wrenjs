import { readdir, readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import {
  ASSET_CACHE_CONTROL,
  CLIENT_DIR,
  EXT_FLT_UNDER,
  EXT_HTML,
  EXT_INDEX_HTML,
  MIME,
  PAGE_CACHE_CONTROL,
  STATIC_ASSETS_CLIENT,
  UTF_8,
} from "../constants.ts";

const files = await readdir(CLIENT_DIR, { recursive: true, withFileTypes: true }).catch(
  (error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  },
);
await Promise.all(
  files.map(async (entry) => {
    if (!entry.isFile()) return;
    const path = resolve(entry.parentPath, entry.name);
    const url = `/${relative(CLIENT_DIR, path).split(sep).join("/")}`;
    const body = await readFile(path);
    const extension = entry.name.slice(entry.name.lastIndexOf("."));
    const file = {
      body,
      headers: [
        "Content-Type",
        `${MIME[extension] ?? "application/octet-stream"}${UTF_8}`,
        "Content-Length",
        String(body.byteLength),
        "Cache-Control",
        extension === ".html" || extension === ".flt" ? PAGE_CACHE_CONTROL : ASSET_CACHE_CONTROL,
      ],
    };
    STATIC_ASSETS_CLIENT.set(url, file);
    if (extension === ".html") {
      const clean = url.endsWith(EXT_INDEX_HTML)
        ? url.slice(0, -EXT_INDEX_HTML.length) || "/"
        : url.slice(0, -EXT_HTML.length);
      STATIC_ASSETS_CLIENT.set(clean, file);
      if (clean !== "/") STATIC_ASSETS_CLIENT.set(`${clean}/`, file);
    }
    if (url.endsWith(EXT_FLT_UNDER) && url !== `/${EXT_FLT_UNDER}`) {
      STATIC_ASSETS_CLIENT.set(`${url.slice(0, -EXT_FLT_UNDER.length)}/${EXT_FLT_UNDER}`, file);
    }
  }),
);
