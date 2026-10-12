import { resolve } from "node:path";

export const UTF_8 = ";charset=utf-8";
// TODO: More robust MIME type handling
export const MIME: Record<string, string> = {
  ".aac": "audio/aac",
  ".apng": "image/apng",
  ".atom": "application/atom+xml",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".cjs": "text/javascript",
  ".css": "text/css",
  ".csv": "text/csv",
  ".eot": "application/vnd.ms-fontobject",
  ".flac": "audio/flac",
  // NOTE: TODO?: Framework-agnostic
  // We assume "flights" use the ".flt" extension
  ".flt": "text/x-component",
  ".gif": "image/gif",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".html": "text/html",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript",
  ".json": "application/json",
  ".jxl": "image/jxl",
  ".m4a": "audio/mp4",
  ".m4v": "video/mp4",
  ".manifest": "text/cache-manifest",
  ".map": "application/json",
  ".md": "text/markdown",
  ".mjs": "text/javascript",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".mpeg": "video/mpeg",
  ".oga": "audio/ogg",
  ".ogg": "audio/ogg",
  ".ogv": "video/ogg",
  ".opus": "audio/ogg",
  ".otf": "font/otf",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".rss": "application/rss+xml",
  ".svg": "image/svg+xml",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".ts": "text/typescript",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
  ".vtt": "text/vtt",
  ".wasm": "application/wasm",
  ".wav": "audio/wav",
  ".weba": "audio/webm",
  ".webm": "video/webm",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xhtml": "application/xhtml+xml",
  ".xml": "application/xml",
  ".zip": "application/zip",
} as const;

// TODO: Configurable?
export const ASSET_CACHE_CONTROL = "public,max-age=31536000,immutable";
export const PAGE_CACHE_CONTROL = "public,max-age=0,must-revalidate";

export const EXT_HTML = ".html";
export const EXT_FLT = ".flt";
export const EXT_INDEX_HTML = "/index.html";
export const EXT_FLT_UNDER = `_${EXT_FLT}`;

interface StaticFile {
  body: Buffer;
  headers: string[];
}

export const CLIENT_DIR = resolve(import.meta.dirname, "client");
export const STATIC_ASSETS_CLIENT = new Map<string, StaticFile>();
