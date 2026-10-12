export const ACCEPT = "Accept";
export const CACHE_CONTROL = "Cache-Control";
export const UTF_8 = "charset=utf-8";
export const CONTENT_TYPE = "Content-Type";
export const VARY = "Vary";
export const X_CONTENT_TYPE_OPTIONS = "X-Content-Type-Options";

export const FLIGHT_HANDLER = "FLIGHT";
export const FLIGHT_MIME_TYPE = `text/x-component;${UTF_8}`;
export const FLIGHT_PAYLOAD_KEY = "_R_";
export const FLIGHT_URL_POSTFIX = "_.flt";
export const FLIGHT_SERVER_ACTION_HEADER = "x-server-action";

export const WINDOW_KEY_FLIGHT_DATA = "__FLIGHT__";
/** Set by the SSR bootstrap script so the React client entry hydrates on import. */
export const WINDOW_KEY_HYDRATE = "__HYDRATE__";
export const LINK_CLIENT_MODULE = "virtual:wrenjs-link-client";
export const LINK_SCRIPT_MODULE = "virtual:wrenjs-link-script";
export const LINK_INVALIDATE_EVENT = "wrenjs:invalidate-prefetch";
export const ISLAND_SCRIPT_MODULE = "virtual:wrenjs-island-script";
export const PAGE_SCRIPT_URL_PREFIX = "virtual:wrenjs-script-url:";
/**
 * Side-effect import declaring that the importing module needs a page script hoisted
 * into every page rendering it, without a `<script>` in JSX: `import "virtual:wrenjs-hoist:<specifier>"`.
 */
export const PAGE_SCRIPT_HOIST_PREFIX = "virtual:wrenjs-hoist:";

/** Build-time export stamped on route modules that need no client runtime. */
export const EXPORT_REQUIRES_CLIENT = "__wrenRequiresClient";
/** Dev-time export stamped on route modules: resolves the stylesheet URLs of their import graph. */
export const EXPORT_CSS = "__wrenCss";
/** Export stamped on route modules: resolves the page-script URLs of their import graph. */
export const EXPORT_SCRIPTS = "__wrenScripts";

/** Files in the router directory that can be route modules; co-located assets (CSS, images) are not. */
export const ROUTE_MODULE_RE = /\.([cm]?[jt]sx?|astro|svelte|tsrx)$/;

export const CLIENT_REFERENCE = Symbol.for("react.client.reference");

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
