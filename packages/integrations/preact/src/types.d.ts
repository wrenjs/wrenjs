import type { ComponentChildren, ComponentType } from "preact";
import type { RouteModule, RouteStack } from "wrenjs/runtime/router";
import type { RouteLoader } from "wrenjs/types";
import type { EXPORT_CSS, EXPORT_SCRIPTS } from "#shared/constants.ts";

export type ApiHandler = (request: Request) => Promise<Response> | Response;

export type LayoutComponent = ComponentType<{
  children?: ComponentChildren;
  data?: ReturnType<RouteLoader>;
  request?: Request;
}>;

export type PageComponent = ComponentType<{
  data?: ReturnType<RouteLoader>;
  params?: Record<string, string>;
  request?: Request;
}>;

export type PreactRouteStack = RouteStack<
  RouteMeta & RouteModule<PageComponent, ApiHandler>,
  RouteMeta & RouteModule<LayoutComponent, ApiHandler>,
  RouteModule<ProxyHandler>
>;

export type ProxyHandler = (request: Request) => Promise<void> | void;

export interface RouteMeta {
  [EXPORT_CSS]?: () => Promise<string[]> | string[];
  [EXPORT_SCRIPTS]?: () => Promise<string[]> | string[];
}
