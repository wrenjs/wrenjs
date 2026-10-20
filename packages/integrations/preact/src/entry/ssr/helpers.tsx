import type { ComponentChildren, ComponentType, VNode } from "preact";
import { Fragment } from "preact";
import { renderToStringAsync } from "preact-render-to-string";
import { jsx } from "preact/jsx-runtime";
import type { PreactRouteStack } from "#/types.ts";
import { composeTree, createPageHandlers, createPageRenderer } from "#shared/entry/ssr/page.ts";

const AsyncFunction = (async () => {}).constructor;
const isAsync = (type: unknown): type is (props: object) => Promise<ComponentChildren> =>
  type instanceof AsyncFunction;

const h = (type: ComponentType<object>, props: object): VNode => {
  if (!isAsync(type)) return jsx(type, props);
  let pending: Promise<unknown> | undefined;
  const children: ComponentChildren[] = [];
  children[0] = jsx(() => {
    pending ??= type(props).then((tree) => children.fill(tree));
    throw pending;
  }, {});
  return jsx(Fragment, { children });
};

export const renderPage = createPageRenderer<PreactRouteStack, VNode>(
  (request, page) => renderToStringAsync(composeTree(request, page, h)),
  renderToStringAsync,
);

export const HANDLERS = createPageHandlers(renderPage);
