import type { RequestInput } from "virtual:wrenjs-fetch";
import type { RouteModule } from "wrenjs/runtime/router";
import { EXPORT_CSS, EXPORT_SCRIPTS } from "../../constants.ts";

export const getRequest = (request: RequestInput): Request =>
  "toRequest" in request ? request.toRequest() : request;

/** Stamped exports are synchronous in builds (static manifest) and async in dev (module graph). */
type UrlExport<K extends string> = { [P in K]?: () => Promise<string[]> | string[] };

const dedupe = (lists: string[][]): string[] =>
  lists.length > 1 ? [...new Set(lists.flat())] : (lists[0] ?? []);

/**
 * URLs resolved by a stamped export of every rendered route module, deduplicated.
 * Synchronous unless a module resolves lazily, keeping builds off the microtask queue.
 */
const collectUrls = <K extends string>(
  modules: UrlExport<K>[],
  key: K,
): Promise<string[]> | string[] => {
  const lists: string[][] = [];
  const pending: Promise<string[]>[] = [];
  for (const module of modules) {
    const list = module[key]?.();
    if (!list) continue;
    if (!Array.isArray(list)) pending.push(list);
    else if (list.length > 0) lists.push(list);
  }
  if (pending.length === 0) return dedupe(lists);
  return Promise.all(pending).then((resolved) => dedupe([...lists, ...resolved]));
};

const joinTags = (urls: string[], tag: (url: string) => string): string => {
  let markup = "";
  for (const url of urls) markup += tag(url);
  return markup;
};

const renderUrls = <K extends string>(
  modules: UrlExport<K>[],
  key: K,
  tag: (url: string) => string,
): Promise<string> | string => {
  const urls = collectUrls(modules, key);
  return Array.isArray(urls) ? joinTags(urls, tag) : urls.then((list) => joinTags(list, tag));
};

const stylesheetTag = (href: string) => `<link rel="stylesheet" href="${href}">`;
const pageScriptTag = (src: string) => `<script type="module" src="${src}"></script>`;

/** Stylesheets of every rendered route module, deduplicated, as `<link>` tags. */
export const renderStylesheets = (
  modules: UrlExport<typeof EXPORT_CSS>[],
): Promise<string> | string => renderUrls(modules, EXPORT_CSS, stylesheetTag);

/**
 * Page scripts hoisted from every rendered route module's import graph, deduplicated, as
 * `<script type="module">` tags. Not `async`: modules stay deferred and run in document order.
 */
export const renderPageScripts = (
  modules: UrlExport<typeof EXPORT_SCRIPTS>[],
): Promise<string> | string => renderUrls(modules, EXPORT_SCRIPTS, pageScriptTag);

/** Page-script URLs of every rendered route module, deduplicated, for renderers that emit the tags. */
export const collectPageScripts = (
  modules: UrlExport<typeof EXPORT_SCRIPTS>[],
): Promise<string[]> | string[] => collectUrls(modules, EXPORT_SCRIPTS);

export const injectIntoHead = (html: string, markup: string): string => {
  if (import.meta.env.DEV) {
    markup = `<script type="module" src="${import.meta.env.BASE_URL}@vite/client"></script>${markup}`;
  }
  const doctype = html.match(/^\s*<!doctype\s+html\s*>/i)?.[0];
  const documentHtml = doctype ? html : `<!DOCTYPE html>${html}`;
  if (!markup) return documentHtml;
  const headIndex = documentHtml.indexOf("</head>");
  const index = headIndex === -1 ? (doctype?.length ?? "<!DOCTYPE html>".length) : headIndex;
  return documentHtml.slice(0, index) + markup + documentHtml.slice(index);
};

/**
 * CSRF defence in depth for state-changing requests: browsers always send `Origin` on
 * POST, and it must match the serving host (honouring a reverse proxy's `X-Forwarded-Host`).
 */
export const isTrustedOrigin = (request: RequestInput): boolean => {
  const origin = request.headers?.get("origin");
  if (!origin) return true;
  const host = request.headers?.get("x-forwarded-host") ?? request.headers?.get("host");
  return URL.parse(origin)?.host === host;
};

export const executeProxies = async (
  request: RequestInput,
  proxies: readonly { default: (request: Request) => unknown }[] | undefined,
): Promise<void> => {
  for (const proxy of proxies ?? []) {
    // oxlint-disable-next-line no-await-in-loop
    await proxy.default(getRequest(request));
  }
};

export type ApiMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
export const API_METHODS: ReadonlySet<string> = new Set<ApiMethod>([
  "DELETE",
  "GET",
  "PATCH",
  "POST",
  "PUT",
]);
export const isApiMethod = (method: string): method is ApiMethod => API_METHODS.has(method);

type ApiRouteStack = {
  module: RouteModule<unknown, (request: Request) => Promise<Response> | Response>;
  proxies?: Parameters<typeof executeProxies>[1];
};

export const handlerApi = async (
  request: RequestInput,
  matchedEntry: ApiRouteStack,
): Promise<Response> => {
  const { module, proxies = [] } = matchedEntry;
  if (proxies.length > 0) await executeProxies(request, proxies);
  const method = request.method?.toUpperCase();
  const handler = method && isApiMethod(method) ? module[method] : undefined;
  if (!handler) {
    return new Response("Method Not Allowed", { status: 405 });
  }
  return await handler(getRequest(request));
};
