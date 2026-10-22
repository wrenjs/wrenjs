import type { RouteModule, RouteStack } from "@wren-js/core/runtime/router";
import type { RouteApiHandler, RouteLayoutProps, RoutePageProps } from "@wren-js/core/types";
import type { EXPORT_CSS, EXPORT_REQUIRES_CLIENT, EXPORT_SCRIPTS } from "./constants.ts";

export type IntegrationRouteStack<TPage = unknown, TLayout = unknown, THead = unknown> = RouteStack<
  RouteMeta & RouteModule<TPage, RouteApiHandler, THead>,
  RouteMeta & RouteModule<TLayout, RouteApiHandler, THead>
>;

export type LayoutProps<TChildren> = RouteLayoutProps<TChildren>;

export type PageProps = RoutePageProps;

interface RouteMeta {
  [EXPORT_CSS]?: () => Promise<string[]> | string[];
  [EXPORT_REQUIRES_CLIENT]?: boolean;
  [EXPORT_SCRIPTS]?: () => Promise<string[]> | string[];
}
