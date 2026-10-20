/// <reference types="vite/client" />

import "./virtual-wrenjs-fetch.d.ts";
import "./virtual-wrenjs-island-script.d.ts";
import "./virtual-wrenjs-link-client.d.ts";
import "./virtual-wrenjs-page-scripts.d.ts";
import "./virtual-wrenjs-routes.d.ts";

declare global {
  namespace Wren {
    interface Context {}
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

export type RouteApiParams = Pick<RouteStack, "context" | "params">;

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

export type RouteHead<TElement = unknown> = ({
  data,
  params,
  request,
}: RouteHeadParams) => Promise<TElement> | TElement;

export interface RouteHeadParams extends RouteLoaderParams {
  data?: ReturnType<RouteLoader>;
}

export type RouteLoader<TDefault = unknown> = ({
  params,
  request,
}: RouteLoaderParams) => Promise<TDefault>;

export interface RouteLoaderParams {
  context: WrenContext;
  params?: Record<string, string>;
  request: Request;
}

export interface RouteModule<TDefault = unknown, THandler = unknown, THead = unknown> {
  config?: RouteConfig;
  default: TDefault;
  DELETE?: THandler;
  GET?: THandler;

  getStaticPaths?: () => Promise<string[]> | string[];
  HEAD?: THandler;
  head?: RouteHead<THead>;
  loader?: RouteLoader<TDefault>;
  OPTIONS?: THandler;
  PATCH?: THandler;
  POST?: THandler;
  PUT?: THandler;
}

/** A `__proxy` default export. Return a `Response` to short-circuit, or nothing to continue. */
export type RouteProxy = (
  context: RouteProxyContext,
  next: RouteProxyNext,
) => Promise<Response | void> | Response | void;

export interface RouteProxyContext {
  context: WrenContext;
  params: Record<string, string>;
  redirect: (location: string | URL, status?: RedirectStatus) => Response;
  request: Request;
  /** The page URL, without the Flight request suffix. */
  url: URL;
}

/** Runs the inner proxies and the route handler; may be called once. */
export type RouteProxyNext = () => Promise<Response>;

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

export type { fetch } from "virtual:wrenjs-fetch";
