import "@lumeland/ssx/jsx-runtime";
import type { RouteModule, RouteStack } from "wrenjs/runtime/router";
import type { RouteLoader } from "wrenjs/types";
import type { EXPORT_CSS, EXPORT_SCRIPTS } from "#shared/constants.ts";

export type ApiHandler = (request: Request) => Promise<Response> | Response;

export type LayoutComponent = SSXComponent<{
  children?: JSX.Children;
  data?: ReturnType<RouteLoader>;
  request?: Request;
}>;

export type PageComponent = SSXComponent<{
  data?: ReturnType<RouteLoader>;
  params?: Record<string, string>;
  request?: Request;
}>;

export type ProxyHandler = (request: Request) => Promise<void> | void;

export interface RouteMeta {
  [EXPORT_CSS]?: () => Promise<string[]> | string[];
  [EXPORT_SCRIPTS]?: () => Promise<string[]> | string[];
}

export type SSXComponent<TProps> = (props: TProps) => JSX.Children | Promise<JSX.Children>;

export type SSXRouteStack = RouteStack<
  RouteMeta & RouteModule<PageComponent, ApiHandler>,
  RouteMeta & RouteModule<LayoutComponent, ApiHandler>,
  RouteModule<ProxyHandler>
>;
