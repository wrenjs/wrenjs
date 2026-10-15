/// <reference types="@vitejs/plugin-rsc/types" />

import type { ComponentType, ReactNode } from "react";
import type { IntegrationRouteStack, LayoutProps, PageProps } from "#shared/types.ts";

export type ReactRouteStack = IntegrationRouteStack<
  ComponentType<PageProps>,
  ComponentType<LayoutProps<ReactNode>>
>;
