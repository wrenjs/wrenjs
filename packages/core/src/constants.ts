import pkg from "../package.json" with { type: "json" };

export const WREN_NAME = "wrenjs";
export const WREN_VERSION = pkg.version;

export const ENTRY_KIND_ROOT = "ROOT";
export const ENTRY_KIND_PAGE = "PAGE";
export const ENTRY_KIND_API = "API";
export const ENTRY_KIND_NOT_FOUND = "NOT_FOUND";
export const ENTRY_KIND_LAYOUT = "LAYOUT";
export const ENTRY_KIND_PROXY = "PROXY";

export const ENTRY_FILEROUTE_ROOT = "___root";
export const ENTRY_FILEROUTE_LAYOUT = "__layout";
export const ENTRY_FILEROUTE_NOT_FOUND = "__not-found";
export const ENTRY_FILEROUTE_PROXY = "__proxy";

export const ENTRY_FILEROUTE_API_EXPORT_GET = "GET";
export const ENTRY_FILEROUTE_API_EXPORT_DELETE = "DELETE";
export const ENTRY_FILEROUTE_API_EXPORT_HEAD = "HEAD";
export const ENTRY_FILEROUTE_API_EXPORT_OPTIONS = "OPTIONS";
export const ENTRY_FILEROUTE_API_EXPORT_PATCH = "PATCH";
export const ENTRY_FILEROUTE_API_EXPORT_POST = "POST";
export const ENTRY_FILEROUTE_API_EXPORT_PUT = "PUT";
export const ENTRY_API_EXPORTS = [
  ENTRY_FILEROUTE_API_EXPORT_GET,
  ENTRY_FILEROUTE_API_EXPORT_DELETE,
  ENTRY_FILEROUTE_API_EXPORT_HEAD,
  ENTRY_FILEROUTE_API_EXPORT_OPTIONS,
  ENTRY_FILEROUTE_API_EXPORT_PATCH,
  ENTRY_FILEROUTE_API_EXPORT_POST,
  ENTRY_FILEROUTE_API_EXPORT_PUT,
] as const;

export { ROUTE_MODULE_RE } from "#shared/constants.ts";
