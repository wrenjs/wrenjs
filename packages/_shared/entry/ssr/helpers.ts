import type { RouteModule } from "@wren-js/core/runtime/router";
import type {
  RouteApiHandler,
  RouteApiParams,
  RouteLoader,
  WrenContext,
} from "@wren-js/core/types";
import type { RequestInput } from "virtual:wrenjs-fetch";
import { ENTRY_API_EXPORTS } from "@wren-js/core/constants";
import { EXPORT_CSS, EXPORT_SCRIPTS } from "../../constants.ts";
import { catchResponse, methodNotAllowed } from "./response.ts";

export const getRequest = (request: RequestInput): Request =>
  "toRequest" in request ? request.toRequest() : request;

class RouteProps {
  declare readonly context: WrenContext;

  get request(): Request {
    return getRequest(this.#input);
  }

  readonly #input: RequestInput;

  constructor(input: RequestInput, context: WrenContext, props: object) {
    Object.assign(this, props);
    this.context = context;
    this.#input = input;
  }
}

export const withRequest = <T extends object>(
  request: RequestInput,
  context: WrenContext,
  props: T,
): T & { readonly context: WrenContext; readonly request: Request } =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- RouteProps copies every prop.
  new RouteProps(request, context, props) as unknown as T & {
    readonly context: WrenContext;
    readonly request: Request;
  };

const hasLoader = ({ loader }: { loader?: RouteLoader }) => loader !== undefined;
const noData = () => undefined;

export const loadRouteData = (
  request: RequestInput,
  context: WrenContext,
  params: Record<string, string>,
  modules: readonly { loader?: RouteLoader }[],
) =>
  modules.some(hasLoader)
    ? Promise.all(
        modules.map(async ({ loader }) => loader?.(withRequest(request, context, { params }))),
      )
    : Promise.resolve(modules.map(noData));

type UrlExport<K extends string> = { [P in K]?: () => Promise<string[]> | string[] };

const dedupe = (lists: string[][]): string[] =>
  lists.length > 1 ? [...new Set(lists.flat())] : (lists[0] ?? []);

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

export const renderStylesheets = (
  modules: UrlExport<typeof EXPORT_CSS>[],
): Promise<string> | string => renderUrls(modules, EXPORT_CSS, stylesheetTag);

export const renderPageScripts = (
  modules: UrlExport<typeof EXPORT_SCRIPTS>[],
): Promise<string> | string => renderUrls(modules, EXPORT_SCRIPTS, pageScriptTag);

export const renderAssetTags = (
  modules: (UrlExport<typeof EXPORT_CSS> & UrlExport<typeof EXPORT_SCRIPTS>)[],
): Promise<string> | string => {
  const stylesheets = renderStylesheets(modules);
  const scripts = renderPageScripts(modules);
  return typeof stylesheets === "string" && typeof scripts === "string"
    ? stylesheets + scripts
    : Promise.all([stylesheets, scripts]).then(([links, tags]) => links + tags);
};

export const collectPageScripts = (
  modules: UrlExport<typeof EXPORT_SCRIPTS>[],
): Promise<string[]> | string[] => collectUrls(modules, EXPORT_SCRIPTS);

const DOCTYPE = "<!DOCTYPE html>";
const DOCTYPE_RE = /^\s*<!doctype\s+html\s*>/i;
export const injectIntoHead = (html: string, markup: string): string => {
  if (import.meta.env.DEV) {
    markup = `<script type="module" src="${import.meta.env.BASE_URL}@vite/client"></script>${markup}`;
  }
  const doctype = html.match(DOCTYPE_RE)?.[0];
  const documentHtml = doctype ? html : `${DOCTYPE}${html}`;
  if (!markup) return documentHtml;
  const headIndex = documentHtml.indexOf("</head>");
  const index = headIndex === -1 ? (doctype?.length ?? DOCTYPE.length) : headIndex;
  return documentHtml.slice(0, index) + markup + documentHtml.slice(index);
};

export const isTrustedOrigin = (request: RequestInput): boolean => {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return URL.parse(origin)?.host === host;
};

type ApiMethod = (typeof ENTRY_API_EXPORTS)[number];
const API_METHODS: ReadonlySet<string> = new Set(ENTRY_API_EXPORTS);
const isApiMethod = (method: string): method is ApiMethod => API_METHODS.has(method);

type ApiRouteStack = RouteApiParams & {
  module: RouteModule<unknown, RouteApiHandler>;
};

export const handlerApi = async (
  request: RequestInput,
  routeStack: ApiRouteStack,
): Promise<Response> => {
  const { module } = routeStack;
  const method = request.method.toUpperCase();
  const handler = isApiMethod(method) ? module[method] : undefined;
  if (!handler) return methodNotAllowed(ENTRY_API_EXPORTS.filter((name) => module[name]));
  try {
    return await handler(getRequest(request), routeStack);
  } catch (error) {
    return catchResponse(error);
  }
};
