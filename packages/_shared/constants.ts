export const ACCEPT = "Accept";
export const CACHE_CONTROL = "Cache-Control";
export const UTF_8 = "charset=utf-8";
export const CONTENT_TYPE = "Content-Type";
export const VARY = "Vary";
export const X_CONTENT_TYPE_OPTIONS = "X-Content-Type-Options";

export const FLIGHT_HANDLER = "FLIGHT";
export const FLIGHT_MIME_TYPE = `text/x-component;${UTF_8}`;
export const FLIGHT_URL_POSTFIX = "_.flt";
export const FLIGHT_SERVER_ACTION_HEADER = "x-server-action";

export const WINDOW_KEY_FLIGHT_DATA = "__FLIGHT__";

export const WINDOW_KEY_HYDRATE = "__HYDRATE__";
export const LINK_CLIENT_MODULE = "virtual:wrenjs-link-client";
export const LINK_SCRIPT_MODULE = "virtual:wrenjs-link-script";
export const LINK_INVALIDATE_EVENT = "wrenjs:invalidate-prefetch";
export const ISLAND_SCRIPT_MODULE = "virtual:wrenjs-island-script";
export const ROUTES_MODULE = "virtual:wrenjs-routes";
export const PAGE_SCRIPT_URL_PREFIX = "virtual:wrenjs-script-url:";

export const PAGE_SCRIPT_HOIST_PREFIX = "virtual:wrenjs-hoist:";

export const EXPORT_REQUIRES_CLIENT = "__wrenRequiresClient";

export const EXPORT_CSS = "__wrenCss";

export const EXPORT_SCRIPTS = "__wrenScripts";

export const ROUTE_MODULE_RE = /\.([cm]?[jt]sx?|astro|svelte|tsrx)$/;

export const SOURCE_RE = /\.[cm]?[jt]sx?$/;

export const WREN_RESPONSE = Symbol.for("wrenjs.response");

export const RESPONSE_DIGEST = "wrenjs.response";

export const HEADERS_HTML_RESPONSE = {
  [CONTENT_TYPE]: `text/html;${UTF_8}`,
  [X_CONTENT_TYPE_OPTIONS]: "nosniff",
} as const;

export const HEADERS_TEXT_RESPONSE = {
  [CONTENT_TYPE]: `text/plain;${UTF_8}`,
  [X_CONTENT_TYPE_OPTIONS]: "nosniff",
} as const;

export const HEADERS_ACTION = {
  [CACHE_CONTROL]: "no-store",
  [CONTENT_TYPE]: FLIGHT_MIME_TYPE,
  [VARY]: "Accept",
  [X_CONTENT_TYPE_OPTIONS]: "nosniff",
} as const;

export const HEADERS_FLIGHT = {
  [CONTENT_TYPE]: FLIGHT_MIME_TYPE,
  [VARY]: "Accept",
  [X_CONTENT_TYPE_OPTIONS]: "nosniff",
} as const;

export const AsyncFunction = (async () => {}).constructor;
export const noop = () => {};
