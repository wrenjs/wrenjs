import type { RequestInput } from "virtual:wrenjs-fetch";
import type { RequestToStackMap } from "#shared/entry/ssr/request-to-stack.ts";
import { renderComponent } from "@lumeland/ssx/jsx-runtime";
import { ENTRY_KIND_API, ENTRY_KIND_NOT_FOUND, ENTRY_KIND_PAGE } from "wrenjs/constants";
import { HEADERS_HTML_RESPONSE } from "#shared/constants.ts";
import {
  executeProxies,
  getRequest,
  handlerApi,
  injectIntoHead,
  renderPageScripts,
  renderStylesheets,
} from "#shared/entry/ssr/helpers.ts";
import type { SSXRouteStack } from "#/types.ts";

export const renderPage = async (
  request: RequestInput,
  matchedEntry: SSXRouteStack,
  _isFlight: boolean = false,
) => {
  const { layouts = [], module, proxies = [] } = matchedEntry;

  if (proxies.length > 0) await executeProxies(request, proxies);

  const data = Promise.all([
    module.loader?.({ params: matchedEntry.params, request: getRequest(request) }),
    ...layouts.map(({ loader }) =>
      loader?.({ params: matchedEntry.params, request: getRequest(request) }),
    ),
  ]);

  const Page = module.default;
  const Wrapped = layouts.reduce(
    (children: JSX.Component, { default: Layout }) => <Layout data={data}>{children}</Layout>,
    <Page data={data} params={matchedEntry.params} />,
  );
  const modules = [module, ...layouts];
  const [html, stylesheets, scripts] = await Promise.all([
    renderComponent(Wrapped),
    renderStylesheets(modules),
    renderPageScripts(modules),
  ]);
  return [html, stylesheets + scripts] as const;
};
const handlerPage = async (
  request: RequestInput,
  matchedEntry: SSXRouteStack,
  isFlight: boolean = false,
): Promise<Response> => {
  const [html, stylesheets] = await renderPage(request, matchedEntry, isFlight);
  return new Response(injectIntoHead(html, stylesheets), {
    headers: HEADERS_HTML_RESPONSE,
    status: 200,
  });
};

export const HANDLERS = {
  [ENTRY_KIND_API]: handlerApi,
  [ENTRY_KIND_NOT_FOUND]: handlerPage,
  [ENTRY_KIND_PAGE]: handlerPage,
} satisfies RequestToStackMap<SSXRouteStack>;
