import type { ReactRouteStack } from "#/types.ts";
import { createPrerender } from "#shared/entry/prerender/render.ts";
import { getSsrEntry, htmlOptions, renderFlight } from "../rsc/helpers.tsx";

export { getPaths } from "#shared/entry/prerender/render.ts";

export const render = createPrerender<ReactRouteStack>(async (request, matched) => {
  const errors: unknown[] = [];
  const onError = (error: unknown) => {
    errors.push(error);
  };
  const [html, flight] = renderFlight(request, matched, { onError }).tee();
  const ssr = await getSsrEntry();
  const bodies = await Promise.all([
    ssr
      .renderToHtml(html, { ...htmlOptions(matched), onError })
      .then((stream) => new Response(stream).arrayBuffer()),
    new Response(flight).arrayBuffer(),
  ]);
  if (errors.length) throw errors[0];
  return bodies;
});
