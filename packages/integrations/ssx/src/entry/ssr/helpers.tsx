import type { WrenContext } from "@wren-js/core/types";
import type { RequestInput } from "virtual:wrenjs-fetch";
import { renderComponent } from "@lumeland/ssx/jsx-runtime";
import type { SSXRouteStack } from "#/types.ts";
import { withRequest } from "#shared/entry/ssr/helpers.ts";
import { createPageHandlers, createPageRenderer } from "#shared/entry/ssr/page.ts";

const withRequestProps = (
  request: RequestInput,
  context: WrenContext,
  element: JSX.Component,
): JSX.Component => Object.assign(element, { props: withRequest(request, context, element.props) });

export const renderPage = createPageRenderer<SSXRouteStack, JSX.Children>(
  (request, { context, data, layouts, module: { default: Page }, params }) =>
    renderComponent(
      layouts.reduce(
        (children: JSX.Component, { default: Layout }) =>
          withRequestProps(request, context, <Layout data={data}>{children}</Layout>),
        withRequestProps(request, context, <Page data={data} params={params} />),
      ),
    ),
  renderComponent,
);

export const HANDLERS = createPageHandlers(renderPage);
