import type { RouteModule, RouteStack } from "@wren-js/core/runtime/router";
import type { RouteApiParams, RouteLoader, WrenContext } from "@wren-js/core/types";
import type { EXPORT_CSS, EXPORT_REQUIRES_CLIENT, EXPORT_SCRIPTS } from "./constants.ts";

export type IntegrationRouteStack<TPage = unknown, TLayout = unknown, THead = unknown> = RouteStack<
  RouteMeta & RouteModule<TPage, ApiHandler, THead>,
  RouteMeta & RouteModule<TLayout, ApiHandler, THead>
>;

export interface LayoutProps<TChildren> {
  children?: TChildren;
  context?: WrenContext;
  data?: ReturnType<RouteLoader>;
  request?: Request;
}

export interface PageProps {
  context?: WrenContext;
  data?: ReturnType<RouteLoader>;
  params?: Record<string, string>;
  request?: Request;
}

type ApiHandler = (request: Request, params: RouteApiParams) => Promise<Response> | Response;

interface RouteMeta {
  [EXPORT_CSS]?: () => Promise<string[]> | string[];
  [EXPORT_REQUIRES_CLIENT]?: boolean;
  [EXPORT_SCRIPTS]?: () => Promise<string[]> | string[];
}
