import type { JSX, VNode } from "preact";
import { renderToStringAsync } from "preact-render-to-string";
import { jsx } from "preact/jsx-runtime";
import type { PreactRouteStack } from "#/types.ts";
import { withRequest } from "#shared/entry/ssr/helpers.ts";
import { createPageHandlers, createPageRenderer } from "#shared/entry/ssr/page.ts";

export const renderPage = createPageRenderer<PreactRouteStack, VNode>(
  (request, { data, layouts, module, params }) =>
    renderToStringAsync(
      layouts.reduce(
        (children: JSX.Element, { default: Layout }) =>
          jsx(Layout, withRequest(request, { children, data })),
        jsx(module.default, withRequest(request, { data, params })),
      ),
    ),
  renderToStringAsync,
);

export const HANDLERS = createPageHandlers(renderPage);
