import type { RouteStack } from "@wrenjs/core/runtime/router";
import type { PrerenderArtifact } from "@wrenjs/core/types";

import { ENTRY_KIND_PAGE } from "@wrenjs/core/constants";
import { getPrerenderPaths } from "@wrenjs/core/runtime/prerender";
import { matchRouteToStack } from "@wrenjs/core/runtime/router";
import * as manifest from "virtual:wrenjs-routes";

import type { PageRenderer } from "../ssr/page.ts";

import { FLIGHT_URL_POSTFIX, HEADERS_FLIGHT, HEADERS_HTML_RESPONSE } from "../../constants.ts";
import { extractPathname } from "../../utils.ts";
import { runProxies } from "../ssr/request-to-stack.ts";
import { catchResponse } from "../ssr/response.ts";

type PrerenderBodies<TStack> = (
	request: Request,
	routeStack: TStack,
) => Promise<readonly [html: BodyInit, flight?: BodyInit]>;

export const getPaths = (prerenderAll = false): Promise<string[]> =>
	getPrerenderPaths(manifest, prerenderAll);

export const createPrerender =
	<TStack extends RouteStack>(renderBodies: PrerenderBodies<TStack>) =>
	async (request: Request): Promise<PrerenderArtifact[]> => {
		const matched = await matchRouteToStack<TStack>(request.url);
		if (matched?.kind !== ENTRY_KIND_PAGE) throw new Error(`Cannot prerender page ${request.url}.`);
		const pathname = extractPathname(request.url)!;
		let rendered: PrerenderArtifact[] = [];
		const response = await runProxies(request, matched, () =>
			renderBodies(request, matched).then(([html, flight]) => {
				rendered = [{ pathname, response: new Response(html, { headers: HEADERS_HTML_RESPONSE }) }];
				if (flight !== undefined) {
					rendered.push({
						pathname: pathname + FLIGHT_URL_POSTFIX,
						response: new Response(flight, { headers: HEADERS_FLIGHT }),
					});
				}
				return rendered[0].response;
			}, catchResponse),
		);
		// Thrown or proxy Responses are prerendered as-is, without Flight; capture() rejects non-200s.
		return response === rendered[0]?.response ? rendered : [{ pathname, response }];
	};

export const documentBodies =
	<TStack>(
		renderPage: PageRenderer<TStack>,
		{ flight = true }: { flight?: boolean } = {},
	): PrerenderBodies<TStack> =>
	async (request, routeStack) => {
		const document = await renderPage(request, routeStack);
		return flight ? [document, document] : [document];
	};
