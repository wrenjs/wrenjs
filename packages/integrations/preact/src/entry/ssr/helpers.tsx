import type { JSX } from "preact";
import type { RequestInput } from "virtual:wrenjs-fetch";
import type { RequestToStackMap } from "#shared/entry/ssr/request-to-stack.ts";
import { Fragment } from "preact";
import { renderToStringAsync } from "preact-render-to-string";
import { ENTRY_KIND_API, ENTRY_KIND_NOT_FOUND, ENTRY_KIND_PAGE } from "wrenjs/constants";
import { HEADERS_FLIGHT, HEADERS_HTML_RESPONSE } from "#shared/constants.ts";
import {
  executeProxies,
  getRequest,
  handlerApi,
  injectIntoHead,
  renderPageScripts,
  renderStylesheets,
} from "#shared/entry/ssr/helpers.ts";
import type { PreactRouteStack } from "#/types.ts";

export const renderPage = async (
  request: RequestInput,
  matchedEntry: PreactRouteStack,
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
    (children: JSX.Element, { default: Layout }) => <Layout data={data}>{children}</Layout>,
    <Page data={data} params={matchedEntry.params} />,
  );
  const modules = [module, ...layouts];
  const [html, stylesheets, scripts] = await Promise.all([
    renderToStringAsync(<Fragment>{Wrapped}</Fragment>),
    renderStylesheets(modules),
    renderPageScripts(modules),
  ]);
  return [html, stylesheets + scripts] as const;
};
const handlerPage = async (
  request: RequestInput,
  matchedEntry: PreactRouteStack,
  isFlight: boolean = false,
): Promise<Response> => {
  const [html, stylesheets] = await renderPage(request, matchedEntry, isFlight);
  // A Preact "flight" is the HTML document itself; Wren Link swaps it in place.
  return new Response(injectIntoHead(html, stylesheets), {
    headers: isFlight ? HEADERS_FLIGHT : HEADERS_HTML_RESPONSE,
    status: 200,
  });
};

export const HANDLERS = {
  [ENTRY_KIND_API]: handlerApi,
  [ENTRY_KIND_NOT_FOUND]: handlerPage,
  [ENTRY_KIND_PAGE]: handlerPage,
} satisfies RequestToStackMap<PreactRouteStack>;
