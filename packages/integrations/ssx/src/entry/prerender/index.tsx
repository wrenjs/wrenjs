import { createPrerender, documentBodies } from "#shared/entry/prerender/render.ts";
import { renderPage } from "../ssr/helpers.tsx";

export { getPaths } from "#shared/entry/prerender/render.ts";
export const render = createPrerender(documentBodies(renderPage, { flight: false }));
