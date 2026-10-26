import type { ComponentChildren, ComponentType, VNode } from "preact";
import { Fragment } from "preact";
import { renderToStringAsync } from "preact-render-to-string";
import { jsx } from "preact/jsx-runtime";
import type { PreactRouteStack } from "#/types.ts";
import { composeTree, createPageHandlers, createPageRenderer } from "#shared/entry/ssr/page.ts";
import { noop } from "#shared/constants.ts";

import { AsyncFunction } from "#shared/constants.ts";

const isAsync = (type: unknown): type is (props: object) => Promise<ComponentChildren> =>
  type instanceof AsyncFunction;

const h = (type: ComponentType<object>, props: object): VNode => {
  if (!isAsync(type)) return jsx(type, props);
  const children: ComponentChildren[] = [];
  const pending = type(props).then((tree) => children.fill(tree));
  pending.catch(noop);
  children[0] = jsx(() => {
    throw pending;
  }, {});
  return jsx(Fragment, { children });
};

export const renderPage = createPageRenderer<PreactRouteStack, VNode>(
  (request, page) => renderToStringAsync(composeTree(request, page, h)),
  renderToStringAsync,
);

export const HANDLERS = createPageHandlers(renderPage);
