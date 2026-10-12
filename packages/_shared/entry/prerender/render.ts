import type { RouteStack } from "wrenjs/runtime/router";
import type { PrerenderArtifact } from "wrenjs/types";
import { matchRouteToStack } from "wrenjs/runtime/router";
import { FLIGHT_URL_POSTFIX, HEADERS_FLIGHT, HEADERS_HTML_RESPONSE } from "../../constants.ts";
import { extractPathname } from "../../utils.ts";
import { injectIntoHead } from "../ssr/helpers.ts";

export type PrerenderPageRenderer<TRouteStack extends RouteStack> = (
  request: Request,
  routeStack: TRouteStack,
  isFlight?: boolean,
) => Promise<readonly [html: string, stylesheets: string]>;

export const requestToPrerender = async <TRouteStack extends RouteStack>(
  request: Request,
  renderPage: PrerenderPageRenderer<TRouteStack>,
): Promise<PrerenderArtifact[]> => {
  const matched = await matchRouteToStack<TRouteStack>(request.url);
  if (!matched || matched.kind !== "PAGE") throw new Error(`Cannot prerender page ${request.url}.`);
  const [html, stylesheets] = await renderPage(request, matched, false);
  const parsed = injectIntoHead(html, stylesheets);
  const pathname = extractPathname(request.url)!;
  return [
    { pathname, response: new Response(parsed, { headers: HEADERS_HTML_RESPONSE }) },
    {
      pathname: pathname + FLIGHT_URL_POSTFIX,
      response: new Response(parsed, { headers: HEADERS_FLIGHT }),
    },
  ];
};
