import type { RequestInput } from "virtual:wrenjs-fetch";
import { ENTRY_KIND_API, ENTRY_KIND_NOT_FOUND, ENTRY_KIND_PAGE } from "@wren-js/core/constants";
import type { IntegrationRouteStack, LayoutProps, PageProps } from "../../types.ts";
import type { RequestToStackMap } from "./request-to-stack.ts";
import { HEADERS_FLIGHT, HEADERS_HTML_RESPONSE } from "../../constants.ts";
import {
  handlerApi,
  injectIntoHead,
  loadRouteData,
  renderPageScripts,
  renderStylesheets,
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
  data: ReturnType<typeof loadRouteData>;
  layouts: NonNullable<TStack["layouts"]>;
  module: TStack["module"];
  modules: (NonNullable<TStack["layouts"]>[number] | TStack["module"])[];
  params: TStack["params"];
}

export const composeTree = <TStack extends IntegrationRouteStack, TElement>(
  request: RequestInput,
  { data, layouts, module, params }: PreparedPage<TStack>,
  h: CreateElement<TStack, TElement>,
): TElement =>
  layouts.reduce(
    (children: TElement, { default: Layout }) =>
      h(Layout, withRequest(request, { children, data })),
    h(module.default, withRequest(request, { data, params })),
  );

export const pageStatus = ({ kind }: { kind: string }): number =>
  kind === ENTRY_KIND_NOT_FOUND ? 404 : 200;

export const preparePage = <TStack extends IntegrationRouteStack>(
  request: RequestInput,
  routeStack: TStack,
): PreparedPage<TStack> => {
  const { layouts = [], module, params } = routeStack;
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
    const page = preparePage(request, routeStack);
    const routeHead = loadRouteHead<TElement>(request, page);
    const [html, head, stylesheets, scripts] = await Promise.all([
      renderTree(request, page),
      routeHead === undefined ? "" : Promise.resolve(routeHead).then(renderHead),
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
    try {
      const [html, head] = await renderPage(request, routeStack);
      return new WrenResponse(injectIntoHead(html, head), {
        headers: isFlight ? HEADERS_FLIGHT : HEADERS_HTML_RESPONSE,
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
