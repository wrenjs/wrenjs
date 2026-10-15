import {
  dynamicNotFounds,
  dynamicRoutes,
  staticNotFounds,
  staticRoutes,
} from "virtual:wrenjs-routes";
import type { RouteStack, RouteStackModules } from "#/types.js";
import { extractPathname } from "#shared/utils.ts";
import { trieLookup } from "./trie-lookup.ts";

export type { RouteModule, RouteStack } from "#/types.js";

export function matchRouteToStack<T extends RouteStack = RouteStack>(
  path?: string,
): Promise<T | undefined> | T | undefined;
export function matchRouteToStack(
  path?: string,
): Promise<RouteStack | undefined> | RouteStack | undefined {
  const pathname = extractPathname(path);
  if (!pathname) return undefined;
  const values: string[] = [];

  const matchedEntry =
    staticRoutes?.[pathname] ??
    trieLookup(dynamicRoutes, pathname, values) ??
    staticNotFounds?.[pathname] ??
    trieLookup(dynamicNotFounds, pathname, values);
  if (!matchedEntry) return undefined;

  const params = Object.fromEntries(matchedEntry.params?.map((name, i) => [name, values[i]]) ?? []);
  const toStack = ({ layouts, module, proxies }: RouteStackModules): RouteStack => ({
    kind: matchedEntry.kind,
    layouts,
    module,
    params,
    proxies,
  });

  const loaded = matchedEntry.stack();
  return loaded instanceof Promise ? loaded.then(toStack) : toStack(loaded);
}
