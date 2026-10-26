import type { WrenContext } from "@wren-js/core/types";
import type { RequestInput } from "virtual:wrenjs-fetch";
import { renderComponent } from "@lumeland/ssx/jsx-runtime";
import type { SSXRouteStack } from "#/types.ts";
import { withRequest } from "#shared/entry/ssr/helpers.ts";
import { createPageHandlers, createPageRenderer } from "#shared/entry/ssr/page.ts";
import { AsyncFunction, noop } from "#shared/constants.ts";


const prepare = (
  request: RequestInput,
  context: WrenContext,
  element: JSX.Component,
): JSX.Component => {
  const props = withRequest(request, context, element.props);
  const { type } = element;
  if (!(type instanceof AsyncFunction)) return Object.assign(element, { props });
  const pending = Promise.resolve(type(props));
  // A layout that never renders its children must not leave an unhandled rejection behind.
  pending.catch(noop);
  return Object.assign(element, { props, type: () => pending });
};

export const renderPage = createPageRenderer<SSXRouteStack, JSX.Children>(
  (request, { context, data, layouts, module: { default: Page }, params }) =>
    renderComponent(
      layouts.reduce(
        (children: JSX.Component, { default: Layout }) =>
          prepare(request, context, <Layout data={data}>{children}</Layout>),
        prepare(request, context, <Page data={data} params={params} />),
      ),
    ),
  renderComponent,
);

export const HANDLERS = createPageHandlers(renderPage);
