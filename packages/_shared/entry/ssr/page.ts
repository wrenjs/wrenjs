import type { RequestInput } from "virtual:wrenjs-fetch";
import { ENTRY_KIND_API, ENTRY_KIND_NOT_FOUND, ENTRY_KIND_PAGE } from "@wren-js/core/constants";
import type { IntegrationRouteStack } from "../../types.ts";
import type { RequestToStackMap } from "./request-to-stack.ts";
import { HEADERS_FLIGHT, HEADERS_HTML_RESPONSE } from "../../constants.ts";
import {
  executeProxies,
  handlerApi,
  injectIntoHead,
  loadRouteData,
  renderPageScripts,
  renderStylesheets,
  withRequest,
} from "./helpers.ts";
import { WrenResponse } from "./response.ts";

export type PageRenderer<TStack> = (
  request: RequestInput,
  routeStack: TStack,
) => Promise<readonly [html: string, head: string]>;

export interface PreparedPage<TStack extends IntegrationRouteStack> {
  data: ReturnType<typeof loadRouteData>;
  layouts: NonNullable<TStack["layouts"]>;
  module: TStack["module"];
  modules: (NonNullable<TStack["layouts"]>[number] | TStack["module"])[];
  params: TStack["params"];
}

export const pageStatus = ({ kind }: { kind: string }): number =>
  kind === ENTRY_KIND_NOT_FOUND ? 404 : 200;

export const preparePage = async <TStack extends IntegrationRouteStack>(
  request: RequestInput,
  routeStack: TStack,
): Promise<PreparedPage<TStack>> => {
  const { layouts = [], module, params, proxies = [] } = routeStack;
  if (proxies.length > 0) await executeProxies(request, proxies);
  const modules = [module, ...layouts];
  return { data: loadRouteData(request, params, modules), layouts, module, modules, params };
};

export const loadRouteHead = <TElement>(
  request: RequestInput,
  { data, modules, params }: PreparedPage<IntegrationRouteStack<unknown, unknown, TElement>>,
): Promise<TElement> | TElement | undefined => {
  for (const { head } of modules) {
    if (head) return head(withRequest(request, { data, params }));
  }
  return undefined;
};

export const createPageRenderer =
  <TStack extends IntegrationRouteStack<unknown, unknown, TElement>, TElement>(
    renderTree: (request: RequestInput, page: PreparedPage<TStack>) => Promise<string> | string,
    renderHead: (element: TElement) => Promise<string> | string,
  ): PageRenderer<TStack> =>
  async (request, routeStack) => {
    const page = await preparePage(request, routeStack);
    const element = loadRouteHead<TElement>(request, page);
    const [html, head, stylesheets, scripts] = await Promise.all([
      renderTree(request, page),
      element === undefined ? "" : Promise.resolve(element).then(renderHead),
      renderStylesheets(page.modules),
      renderPageScripts(page.modules),
    ]);
    return [html, head + stylesheets + scripts] as const;
  };

export const createPageHandlers = <TStack extends IntegrationRouteStack>(
  renderPage: PageRenderer<TStack>,
) => {
  const handlerPage = async (
    request: RequestInput,
    routeStack: TStack,
    isFlight = false,
  ): Promise<Response> => {
    const [html, head] = await renderPage(request, routeStack);
    return new WrenResponse(injectIntoHead(html, head), {
      headers: isFlight ? HEADERS_FLIGHT : HEADERS_HTML_RESPONSE,
      status: pageStatus(routeStack),
    });
  };
  return {
    [ENTRY_KIND_API]: handlerApi,
    [ENTRY_KIND_NOT_FOUND]: handlerPage,
    [ENTRY_KIND_PAGE]: handlerPage,
  } satisfies RequestToStackMap<TStack>;
};
