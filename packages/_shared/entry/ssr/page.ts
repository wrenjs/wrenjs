import type { RequestInput } from "virtual:wrenjs-fetch";
import { ENTRY_KIND_API, ENTRY_KIND_NOT_FOUND, ENTRY_KIND_PAGE } from "@wren-js/core/constants";
import type { IntegrationRouteStack, LayoutProps, PageProps } from "../../types.ts";
import type { RequestToStackMap } from "./request-to-stack.ts";
import { HEADERS_FLIGHT, HEADERS_HTML_RESPONSE } from "../../constants.ts";
import {
  handlerApi,
  injectIntoHead,
  loadRouteData,
  renderAssetTags,
  withRequest,
} from "./helpers.ts";
import { catchResponse, WrenResponse } from "./response.ts";

export interface CreateElement<TStack extends IntegrationRouteStack, TElement> {
  (type: TStack["module"]["default"], props: PageProps): TElement;
  (type: NonNullable<TStack["layouts"]>[number]["default"], props: LayoutProps<TElement>): TElement;
}

export type PageRenderer<TStack> = (
  request: RequestInput,
  routeStack: TStack,
) => Promise<readonly [html: string, head: string]>;

export interface PreparedPage<TStack extends IntegrationRouteStack> {
  context: TStack["context"];
  data: ReturnType<typeof loadRouteData>;
  layouts: NonNullable<TStack["layouts"]>;
  module: TStack["module"];
  modules: (NonNullable<TStack["layouts"]>[number] | TStack["module"])[];
  params: TStack["params"];
}

export const composeTree = <TStack extends IntegrationRouteStack, TElement>(
  request: RequestInput,
  { context, data, layouts, module, params }: PreparedPage<TStack>,
  h: CreateElement<TStack, TElement>,
): TElement =>
  layouts.reduce(
    (children: TElement, { default: Layout }) =>
      h(Layout, withRequest(request, context, { children, data })),
    h(module.default, withRequest(request, context, { data, params })),
  );

export const pageStatus = ({ kind }: { kind: string }): number =>
  kind === ENTRY_KIND_NOT_FOUND ? 404 : 200;

type HeaderRecord = Readonly<Record<string, string>>;

const pageHeadersCache = new WeakMap<object, readonly [HeaderRecord, HeaderRecord]>();
const hasHeaders = ({ config }: IntegrationRouteStack["module"]) => config?.headers !== undefined;

// Header names are case-insensitive, so later records must override earlier ones in any case.
const mergeHeaders = (records: readonly (HeaderRecord | undefined)[]): HeaderRecord => {
  const merged: Record<string, string> = {};
  for (const record of records) {
    for (const [name, value] of Object.entries(record ?? {})) merged[name.toLowerCase()] = value;
  }
  return merged;
};

export const pageHeaders = (
  { layouts = [], module }: Pick<IntegrationRouteStack, "layouts" | "module">,
  isFlight: boolean,
): HeaderRecord => {
  if (!hasHeaders(module) && !layouts.some(hasHeaders)) {
    return isFlight ? HEADERS_FLIGHT : HEADERS_HTML_RESPONSE;
  }
  let headers = import.meta.env.DEV ? undefined : pageHeadersCache.get(module);
  if (!headers) {
    const custom = [
      ...layouts.toReversed().map((layout) => layout.config?.headers),
      module.config?.headers,
    ];
    headers = [
      mergeHeaders([HEADERS_HTML_RESPONSE, ...custom]),
      mergeHeaders([HEADERS_FLIGHT, ...custom]),
    ];
    pageHeadersCache.set(module, headers);
  }
  return headers[isFlight ? 1 : 0];
};

export const preparePage = <TStack extends IntegrationRouteStack>(
  request: RequestInput,
  routeStack: TStack,
): PreparedPage<TStack> => {
  const { context, layouts = [], module, params } = routeStack;
  const modules = [module, ...layouts];
  const data = loadRouteData(request, context, params, modules);
  return { context, data, layouts, module, modules, params };
};

export const loadRouteHead = <TElement>(
  request: RequestInput,
  {
    context,
    data,
    modules,
    params,
  }: PreparedPage<IntegrationRouteStack<unknown, unknown, TElement>>,
): Promise<TElement> | TElement | undefined => {
  for (const { head } of modules) {
    if (head) return head(withRequest(request, context, { data, params }));
  }
  return undefined;
};

// Builds resolve each route's stylesheets and page scripts statically, so their tags are
// rendered once per route instead of on every request.
const assetTagsCache = new WeakMap<object, string>();
const routeAssetTags = (
  module: object,
  modules: Parameters<typeof renderAssetTags>[0],
): Promise<string> | string => {
  if (import.meta.env.DEV) return renderAssetTags(modules);
  let tags = assetTagsCache.get(module);
  if (tags === undefined) {
    const rendered = renderAssetTags(modules);
    if (typeof rendered !== "string") return rendered;
    tags = rendered;
    assetTagsCache.set(module, tags);
  }
  return tags;
};

export const createPageRenderer =
  <TStack extends IntegrationRouteStack<unknown, unknown, TElement>, TElement>(
    renderTree: (request: RequestInput, page: PreparedPage<TStack>) => Promise<string> | string,
    renderHead: (element: TElement) => Promise<string> | string,
  ): PageRenderer<TStack> =>
  async (request, routeStack) => {
    const page = preparePage(request, routeStack);
    const routeHead = loadRouteHead<TElement>(request, page);
    const [html, head, assets] = await Promise.all([
      renderTree(request, page),
      routeHead === undefined ? "" : Promise.resolve(routeHead).then(renderHead),
      routeAssetTags(page.module, page.modules),
    ]);
    return [html, head + assets] as const;
  };

export const createPageHandlers = <TStack extends IntegrationRouteStack>(
  renderPage: PageRenderer<TStack>,
) => {
  const handlerPage = async (
    request: RequestInput,
    routeStack: TStack,
    isFlight = false,
  ): Promise<Response> => {
    try {
      const [html, head] = await renderPage(request, routeStack);
      return new WrenResponse(injectIntoHead(html, head), {
        headers: pageHeaders(routeStack, isFlight),
        status: pageStatus(routeStack),
      });
    } catch (error) {
      return catchResponse(error);
    }
  };
  return {
    [ENTRY_KIND_API]: handlerApi,
    [ENTRY_KIND_NOT_FOUND]: handlerPage,
    [ENTRY_KIND_PAGE]: handlerPage,
  } satisfies RequestToStackMap<TStack>;
};
