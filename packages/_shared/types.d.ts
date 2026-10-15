import type { RouteModule, RouteStack } from "@wren-js/core/runtime/router";
import type { RouteLoader } from "@wren-js/core/types";
import type { EXPORT_CSS, EXPORT_REQUIRES_CLIENT, EXPORT_SCRIPTS } from "./constants.ts";

export type IntegrationRouteStack<TPage = unknown, TLayout = unknown> = RouteStack<
  RouteMeta & RouteModule<TPage, ApiHandler>,
  RouteMeta & RouteModule<TLayout, ApiHandler>,
  RouteModule<ProxyHandler>
>;

export interface LayoutProps<TChildren> {
  children?: TChildren;
  data?: ReturnType<RouteLoader>;
  request?: Request;
}

export interface PageProps {
  data?: ReturnType<RouteLoader>;
  params?: Record<string, string>;
  request?: Request;
}

type ApiHandler = (request: Request) => Promise<Response> | Response;

type ProxyHandler = (request: Request) => Promise<void> | void;

interface RouteMeta {
  [EXPORT_CSS]?: () => Promise<string[]> | string[];
  [EXPORT_REQUIRES_CLIENT]?: boolean;
  [EXPORT_SCRIPTS]?: () => Promise<string[]> | string[];
}
