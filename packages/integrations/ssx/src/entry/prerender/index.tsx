import type { PrerenderArtifact } from "wrenjs/types";
import * as manifest from "virtual:wrenjs-routes";
import { getPrerenderPaths } from "wrenjs/runtime/prerender";
import { requestToPrerender } from "#shared/entry/prerender/render.ts";
import type { SSXRouteStack } from "../../types.js";
import { renderPage } from "../ssr/helpers.tsx";

export const getPaths = (prerenderAll = false): Promise<string[]> =>
  getPrerenderPaths(manifest, prerenderAll);

export const render = (request: Request): Promise<PrerenderArtifact[]> =>
  requestToPrerender<SSXRouteStack>(request, renderPage);
