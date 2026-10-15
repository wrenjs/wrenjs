import "@lumeland/ssx/jsx-runtime";
import type { IntegrationRouteStack, LayoutProps, PageProps } from "#shared/types.ts";

export type SSXRouteStack = IntegrationRouteStack<
  SSXComponent<PageProps>,
  SSXComponent<LayoutProps<JSX.Children>>
>;

type SSXComponent<TProps> = (props: TProps) => JSX.Children | Promise<JSX.Children>;
