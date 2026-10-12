/// <reference types="@vitejs/plugin-rsc/types" />
import type { ComponentType, ReactNode } from "react";
import type { RouteModule, RouteStack } from "wrenjs/runtime/router";
import type { RouteLoader } from "wrenjs/types";
import type { EXPORT_REQUIRES_CLIENT, EXPORT_SCRIPTS } from "#shared/constants.ts";

export type ApiHandler = (request: Request) => Promise<Response> | Response;

/** `false` only when the build proved the module's import graph is server-only. */
export interface HydrationMeta {
  [EXPORT_REQUIRES_CLIENT]?: boolean;
  [EXPORT_SCRIPTS]?: () => Promise<string[]> | string[];
}
export type LayoutComponent = ComponentType<{
  children?: ReactNode;
  data?: ReturnType<RouteLoader>;
  request?: Request;
}>;

export type PageComponent = ComponentType<{
  data?: ReturnType<RouteLoader>;
  params?: Record<string, string>;
  request?: Request;
}>;

export type ProxyHandler = (request: Request) => Promise<void> | void;

export type ReactRouteStack = RouteStack<
  HydrationMeta & RouteModule<PageComponent, ApiHandler>,
  HydrationMeta & RouteModule<LayoutComponent, ApiHandler>,
  RouteModule<ProxyHandler>
>;
