import { renderComponent } from "@lumeland/ssx/jsx-runtime";
import type { SSXRouteStack } from "#/types.ts";
import { AsyncFunction, noop } from "#shared/constants.ts";
import { composeTree, createPageHandlers, createPageRenderer } from "#shared/entry/ssr/page.ts";

type Component = (props: object) => JSX.Children | Promise<JSX.Children>;

const h = (type: Component, props: object): JSX.Component => {
  let Type = type;
  if (type instanceof AsyncFunction) {
    const pending = Promise.resolve(type(props));
    pending.catch(noop);
    Type = () => pending;
  }
  return Object.assign(<Type />, { props });
};

export const renderPage = createPageRenderer<SSXRouteStack, JSX.Children>(
  (request, page) => renderComponent(composeTree(request, page, h)),
  renderComponent,
);

export const HANDLERS = createPageHandlers(renderPage);
