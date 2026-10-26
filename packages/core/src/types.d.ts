/// <reference types="vite/client" />

import "./virtual-wrenjs-fetch.d.ts";
import "./virtual-wrenjs-island-script.d.ts";
import "./virtual-wrenjs-link-client.d.ts";
import "./virtual-wrenjs-page-scripts.d.ts";
import "./virtual-wrenjs-routes.d.ts";

declare global {
  namespace Wren {
    type ApiHandler<TParams extends RouteParams = RouteParams> = RouteApiHandler<TParams>;
    type ApiParams<TParams extends RouteParams = RouteParams> = RouteApiParams<TParams>;
    type Config = RouteConfig;
    interface Context {}
    type GetStaticPaths = () => Promise<string[]> | string[];
    type Head<TParams extends RouteParams = RouteParams, TData = unknown> = RouteHead<
      IntegrationHead,
      TParams,
      TData
    >;
    type HeadProps<TParams extends RouteParams = RouteParams, TData = unknown> = RouteHeadParams<
      TParams,
      TData
    >;
    interface Integration {}
    type Layout<TData = unknown> = RouteComponent<LayoutProps<TData>, IntegrationNode>;
    type LayoutProps<TData = unknown> = RouteLayoutProps<IntegrationNode, TData>;
    type Loader<TReturn = unknown, TParams extends RouteParams = RouteParams> = RouteLoader<
      TReturn,
      TParams
    >;
    type LoaderProps<TParams extends RouteParams = RouteParams> = RouteLoaderParams<TParams>;
    type Page<TParams extends RouteParams = RouteParams, TData = unknown> = RouteComponent<
      PageProps<TParams, TData>,
      IntegrationNode
    >;
    type PageProps<TParams extends RouteParams = RouteParams, TData = unknown> = RoutePageProps<
      TParams,
      TData
    >;
    type Proxy<TParams extends RouteParams = RouteParams> = RouteProxy<TParams>;
    type ProxyContext<TParams extends RouteParams = RouteParams> = RouteProxyContext<TParams>;
    type ProxyNext = () => Promise<Response>;
  }
}

export interface Entry {
  file: string;

  kind: EntryKind;

  layouts?: Entry[];

  params?: string[];

  pattern?: string;

  proxies?: Entry[];
}

import type {
  ENTRY_KIND_API,
  ENTRY_KIND_LAYOUT,
  ENTRY_KIND_NOT_FOUND,
  ENTRY_KIND_PAGE,
  ENTRY_KIND_PROXY,
  ENTRY_KIND_ROOT,
} from "./constants.ts";

export type EntryKind =
  | typeof ENTRY_KIND_API
  | typeof ENTRY_KIND_LAYOUT
  | typeof ENTRY_KIND_NOT_FOUND
  | typeof ENTRY_KIND_PAGE
  | typeof ENTRY_KIND_PROXY
  | typeof ENTRY_KIND_ROOT;

export interface PrerenderArtifact {
  pathname: string;
  response: Response;
}

export interface PrerenderRuntime {
  getPaths(prerenderAll?: boolean): Promise<string[]>;
  render(request: Request): Promise<PrerenderArtifact[]>;
}

export interface RadixTrie<Route = Entry> {
  e?: Route;

  m?: { lits: string[]; node: RadixTrie<Route> }[];

  p?: RadixTrie<Route>;

  s: Record<string, RadixTrie<Route>>;

  w?: Route;
}

export type RedirectStatus = 301 | 302 | 303 | 307 | 308;

export interface RoutableEntry {
  notFounds: Entry[];
  routes: Entry[];
}

export type RouteApiHandler<TParams extends RouteParams = RouteParams> = (
  request: Request,
  route: RouteApiParams<TParams>,
) => Promise<Response> | Response;

export interface RouteApiParams<TParams extends RouteParams = RouteParams> {
  context: WrenContext;
  params: TParams;
}

export type RouteComponent<TProps, TNode> = (props: TProps) => Promise<TNode> | TNode;

export interface RouteConfig {
  headers?: Readonly<Record<string, string>>;
  prerender?: boolean;
}

export interface RouteEntry {
  kind: RouteStack["kind"];
  layouts?: (() => Promise<RouteModule>)[];
  module: () => Promise<RouteModule>;
  params?: string[];
  pattern?: string;
  proxies?: (() => Promise<RouteModule>)[];

  stack: () => Promise<RouteStackModules> | RouteStackModules;
}

export type RouteHead<
  TElement = unknown,
  TParams extends RouteParams = RouteParams,
  TData = unknown,
> = ({ data, params, request }: RouteHeadParams<TParams, TData>) => Promise<TElement> | TElement;

export interface RouteHeadParams<
  TParams extends RouteParams = RouteParams,
  TData = unknown,
> extends RouteLoaderParams<TParams> {
  data?: Promise<TData>;
}

export interface RouteLayoutProps<TChildren = unknown, TData = unknown> {
  children?: TChildren;
  context?: WrenContext;
  data?: Promise<TData>;
  request?: Request;
}

export type RouteLoader<TReturn = unknown, TParams extends RouteParams = RouteParams> = ({
  params,
  request,
}: RouteLoaderParams<TParams>) => Promise<TReturn>;

export interface RouteLoaderParams<TParams extends RouteParams = RouteParams> {
  context: WrenContext;
  params?: TParams;
  request: Request;
}

export interface RouteModule<TDefault = unknown, THandler = unknown, THead = unknown> {
  config?: RouteConfig;
  default: TDefault;
  DELETE?: THandler;
  GET?: THandler;

  getStaticPaths?: Wren.GetStaticPaths;
  HEAD?: THandler;
  head?: RouteHead<THead>;
  loader?: RouteLoader;
  OPTIONS?: THandler;
  PATCH?: THandler;
  POST?: THandler;
  PUT?: THandler;
}

export interface RoutePageProps<TParams extends RouteParams = RouteParams, TData = unknown> {
  context?: WrenContext;
  data?: Promise<TData>;
  params?: TParams;
  request?: Request;
}

export type RouteParams = Record<string, string>;

/** A `__proxy` default export. Return a `Response` to short-circuit, or nothing to continue. */
export type RouteProxy<TParams extends RouteParams = RouteParams> = (
  context: RouteProxyContext<TParams>,
  next: RouteProxyNext,
) => Promise<Response | void> | Response | void;

export interface RouteProxyContext<TParams extends RouteParams = RouteParams> {
  context: WrenContext;
  params: TParams;
  redirect: (location: string | URL, status?: RedirectStatus) => Response;
  request: Request;
  /** The page URL, without the Flight request suffix. */
  url: URL;
}

/** Runs the inner proxies and the route handler; may be called once. */
export type RouteProxyNext = Wren.ProxyNext;

export interface RouteStack<
  TModule extends RouteModule = RouteModule,
  TLayout extends RouteModule = RouteModule,
  TProxy extends RouteModule = RouteModule<RouteProxy>,
> {
  context: WrenContext;
  kind: "API" | "NOT_FOUND" | "PAGE";
  layouts?: TLayout[];
  module: TModule;
  params: Record<string, string>;
  proxies?: TProxy[];
}

export type RouteStackModules = Pick<Required<RouteStack>, "layouts" | "module" | "proxies">;

export type WrenContext = Wren.Context;

type IntegrationHead = Wren.Integration extends { head: infer THead } ? THead : IntegrationNode;

type IntegrationNode = Wren.Integration extends { node: infer TNode } ? TNode : unknown;

export type { fetch } from "virtual:wrenjs-fetch";
