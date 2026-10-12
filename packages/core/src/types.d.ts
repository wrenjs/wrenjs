// Asset module declarations (`*.css`, `?url`, ...) for app code that imports them.
/// <reference types="vite/client" />
import "./virtual-wrenjs-fetch.d.ts";
import "./virtual-wrenjs-island-script.d.ts";
import "./virtual-wrenjs-link-client.d.ts";
import "./virtual-wrenjs-page-scripts.d.ts";
import "./virtual-wrenjs-routes.d.ts";

export interface Entry {
  /** Full source file path. */
  file: string;

  /** Associated route groups if a `ENTRY_KIND_PAGE`. */
  groups?: string[];

  /** Unique identifier for the entry. */
  id: number;

  /** The kind of the entry, e.g., API, PAGE, LAYOUT, etc. */
  kind: EntryKind;

  /** Associated layouts if a `ENTRY_KIND_PAGE`. */
  layouts?: Entry[];

  /** Route parameters in pattern order, e.g. [param]-[id].tsx -> ["param", "id"], [...rest].tsx -> ["rest"]. */
  params?: string[];

  /** Extracted route pattern for URL matching. */
  pattern?: string;

  /** Associated proxies if a `ENTRY_KIND_PAGE` or `ENTRY_KIND_API`. */
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

export interface PartitionedRoutes {
  dynamicNotFound?: Entry[];
  dynamicRoutes?: Entry[];
  staticNotFound?: Entry[];
  staticRoutes?: Entry[];
}

/** One public GET representation. Framework-specific payloads remain opaque to core. */
export interface PrerenderArtifact {
  pathname: string;
  response: Response;
}

/** Exports required from an integration's compiled prerender entry. */
export interface PrerenderRuntime {
  getPaths(prerenderAll?: boolean): Promise<string[]>;
  render(request: Request): Promise<PrerenderArtifact[]>;
}

export interface RadixTrie<Route = Entry> {
  /** Terminal route. */
  e?: Route;
  /** Mixed segments, tried in insertion order. */
  m?: { lits: string[]; node: RadixTrie<Route> }[];
  /** Parameter child. */
  p?: RadixTrie<Route>;
  /** Static children keyed by segment. */
  s: Record<string, RadixTrie<Route>>;
  /** Catch-all terminal. */
  w?: Route;
}

export interface RoutableEntry {
  notFounds?: Entry[];
  routes?: Entry[];
}

export interface RouteConfig {
  /** Whether to prerender; defaults to `false` at runtime. */
  prerender?: boolean;
}

/** The compiled manifest's lazy route entry, shared by routing and prerender discovery. */
export interface RouteEntry {
  kind: RouteStack["kind"];
  layouts?: (() => Promise<RouteModule>)[];
  module: () => Promise<RouteModule>;
  params?: string[];
  pattern?: string;
  proxies?: (() => Promise<RouteModule>)[];
  /** Loads module, layouts, and proxies together; synchronous once cached (build). */
  stack: () => Promise<RouteStackModules> | RouteStackModules;
}

export type RouteLoader<TDefault = unknown> = ({
  params,
  request,
}: RouteLoaderParams) => Promise<TDefault>;

export interface RouteLoaderParams {
  params?: Record<string, string>;
  request: Request;
}

export interface RouteModule<TDefault = unknown, THandler = unknown> {
  config?: RouteConfig;
  default: TDefault;
  DELETE?: THandler;
  GET?: THandler;
  /** Concrete URL pathnames to prerender for a parameterized page. */
  getStaticPaths?: () => Promise<string[]> | string[];
  loader?: RouteLoader<TDefault>;
  PATCH?: THandler;
  POST?: THandler;
  PUT?: THandler;
}

export interface RouteStack<
  TModule extends RouteModule = RouteModule,
  TLayout extends RouteModule = RouteModule,
  TProxy extends RouteModule = RouteModule,
> {
  kind: "API" | "NOT_FOUND" | "PAGE";
  layouts?: TLayout[];
  module: TModule;
  params: Record<string, string>;
  proxies?: TProxy[];
}

export type RouteStackModules = Pick<Required<RouteStack>, "layouts" | "module" | "proxies">;

export type { fetch } from "virtual:wrenjs-fetch";
