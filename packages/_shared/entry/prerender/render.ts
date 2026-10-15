import type { RouteStack } from "@wren-js/core/runtime/router";
import type { PrerenderArtifact } from "@wren-js/core/types";
import { ENTRY_KIND_PAGE } from "@wren-js/core/constants";
import { getPrerenderPaths } from "@wren-js/core/runtime/prerender";
import { matchRouteToStack } from "@wren-js/core/runtime/router";
import * as manifest from "virtual:wrenjs-routes";
import type { PageRenderer } from "../ssr/page.ts";
import { FLIGHT_URL_POSTFIX, HEADERS_FLIGHT, HEADERS_HTML_RESPONSE } from "../../constants.ts";
import { extractPathname } from "../../utils.ts";
import { injectIntoHead } from "../ssr/helpers.ts";

type PrerenderBodies<TStack> = (
  request: Request,
  routeStack: TStack,
) => Promise<readonly [html: BodyInit, flight: BodyInit]>;

export const getPaths = (prerenderAll = false): Promise<string[]> =>
  getPrerenderPaths(manifest, prerenderAll);

export const createPrerender =
  <TStack extends RouteStack>(renderBodies: PrerenderBodies<TStack>) =>
  async (request: Request): Promise<PrerenderArtifact[]> => {
    const matched = await matchRouteToStack<TStack>(request.url);
    if (matched?.kind !== ENTRY_KIND_PAGE) throw new Error(`Cannot prerender page ${request.url}.`);
    const [html, flight] = await renderBodies(request, matched);
    const pathname = extractPathname(request.url)!;
    return [
      { pathname, response: new Response(html, { headers: HEADERS_HTML_RESPONSE }) },
      {
        pathname: pathname + FLIGHT_URL_POSTFIX,
        response: new Response(flight, { headers: HEADERS_FLIGHT }),
      },
    ];
  };

export const documentBodies =
  <TStack>(renderPage: PageRenderer<TStack>): PrerenderBodies<TStack> =>
  async (request, routeStack) => {
    const [html, head] = await renderPage(request, routeStack);
    const document = injectIntoHead(html, head);
    return [document, document];
  };
