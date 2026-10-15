import type { ComponentChildren, ComponentType } from "preact";
import type { IntegrationRouteStack, LayoutProps, PageProps } from "#shared/types.ts";

export type PreactRouteStack = IntegrationRouteStack<
  ComponentType<PageProps>,
  ComponentType<LayoutProps<ComponentChildren>>
>;
