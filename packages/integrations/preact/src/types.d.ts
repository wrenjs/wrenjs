import type { ComponentChildren, ComponentType, VNode } from "preact";
import type { IntegrationRouteStack, LayoutProps, PageProps } from "#shared/types.ts";

export type PreactRouteStack = IntegrationRouteStack<
  ComponentType<PageProps>,
  ComponentType<LayoutProps<ComponentChildren>>,
  VNode
>;
