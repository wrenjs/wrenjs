import type { VNode } from "preact";
import { renderToStringAsync } from "preact-render-to-string";
import { jsx } from "preact/jsx-runtime";
import type { PreactRouteStack } from "#/types.ts";
import { composeTree, createPageHandlers, createPageRenderer } from "#shared/entry/ssr/page.ts";

export const renderPage = createPageRenderer<PreactRouteStack, VNode>(
  (request, page) => renderToStringAsync(composeTree(request, page, jsx)),
  renderToStringAsync,
);

export const HANDLERS = createPageHandlers(renderPage);
