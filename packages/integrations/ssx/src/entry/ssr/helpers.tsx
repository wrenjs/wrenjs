import type { RequestInput } from "virtual:wrenjs-fetch";
import { renderComponent } from "@lumeland/ssx/jsx-runtime";
import type { SSXRouteStack } from "#/types.ts";
import { withRequest } from "#shared/entry/ssr/helpers.ts";
import { createPageHandlers, createPageRenderer } from "#shared/entry/ssr/page.ts";

const withRequestProps = (request: RequestInput, element: JSX.Component): JSX.Component =>
  Object.assign(element, { props: withRequest(request, element.props) });

export const renderPage = createPageRenderer<SSXRouteStack, JSX.Children>(
  (request, { data, layouts, module: { default: Page }, params }) =>
    renderComponent(
      layouts.reduce(
        (children: JSX.Component, { default: Layout }) =>
          withRequestProps(request, <Layout data={data}>{children}</Layout>),
        withRequestProps(request, <Page data={data} params={params} />),
      ),
    ),
  renderComponent,
);

export const HANDLERS = createPageHandlers(renderPage);
