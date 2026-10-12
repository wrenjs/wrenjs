import type { PrerenderArtifact } from "wrenjs/types";
import * as manifest from "virtual:wrenjs-routes";
import { getPrerenderPaths } from "wrenjs/runtime/prerender";
import { matchRouteToStack } from "wrenjs/runtime/router";
import { FLIGHT_URL_POSTFIX, HEADERS_FLIGHT, HEADERS_HTML_RESPONSE } from "#shared/constants.ts";
import { extractPathname } from "#shared/utils.ts";
import type { ReactRouteStack } from "#/types.js";
import { getSsrEntry, htmlOptions, renderFlight } from "../rsc/helpers.tsx";

export const getPaths = (prerenderAll = false): Promise<string[]> =>
  getPrerenderPaths(manifest, prerenderAll);

export const render = async (request: Request): Promise<PrerenderArtifact[]> => {
  const matched = await matchRouteToStack<ReactRouteStack>(request.url);
  if (matched?.kind !== "PAGE") throw new Error(`Cannot prerender page ${request.url}.`);
  const errors: unknown[] = [];
  const onError = (error: unknown) => {
    errors.push(error);
  };
  const [html, flight] = (await renderFlight(request, matched, { onError })).tee();
  const ssr = await getSsrEntry();
  const [htmlBody, flightBody] = await Promise.all([
    ssr
      .renderToHtml(html, { ...htmlOptions(matched), onError })
      .then(({ stream }) => new Response(stream).arrayBuffer()),
    new Response(flight).arrayBuffer(),
  ]);
  if (errors.length) throw errors[0];
  const pathname = extractPathname(request.url)!;
  return [
    { pathname, response: new Response(htmlBody, { headers: HEADERS_HTML_RESPONSE }) },
    {
      pathname: pathname + FLIGHT_URL_POSTFIX,
      response: new Response(flightBody, { headers: HEADERS_FLIGHT }),
    },
  ];
};
