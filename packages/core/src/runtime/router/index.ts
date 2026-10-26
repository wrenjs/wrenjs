import {
  dynamicNotFounds,
  dynamicRoutes,
  staticNotFounds,
  staticRoutes,
} from "virtual:wrenjs-routes";
import type { RouteEntry, RouteStack, RouteStackModules, WrenContext } from "#/types.js";
import { extractPathname } from "#shared/utils.ts";
import { trieLookup } from "./trie-lookup.ts";

export type { RouteModule, RouteStack } from "#/types.js";

const loadStack = (
  { kind, stack }: RouteEntry,
  params: Record<string, string>,
  context: WrenContext,
): Promise<RouteStack> | RouteStack => {
  const toStack = ({ layouts, module, proxies }: RouteStackModules): RouteStack => ({
    context,
    kind,
    layouts,
    module,
    params,
    proxies,
  });
  const loaded = stack();
  return loaded instanceof Promise ? loaded.then(toStack) : toStack(loaded);
};

export function matchRouteToStack<T extends RouteStack = RouteStack>(
  path?: string,
  context?: WrenContext,
): Promise<T | undefined> | T | undefined;
export function matchRouteToStack(
  path?: string,
  context = {} as WrenContext,
): Promise<RouteStack | undefined> | RouteStack | undefined {
  const pathname = extractPathname(path);
  if (!pathname) return undefined;

  const staticEntry = staticRoutes?.[pathname];
  if (staticEntry) return loadStack(staticEntry, {}, context);

  const values: string[] = [];
  const matchedEntry =
    trieLookup(dynamicRoutes, pathname, values) ??
    staticNotFounds?.[pathname] ??
    trieLookup(dynamicNotFounds, pathname, values);
  if (!matchedEntry) return undefined;

  const names = matchedEntry.params;
  const params: Record<string, string> = names
    ? Object.fromEntries(names.map((name, i) => [name, values[i]]))
    : {};
  return loadStack(matchedEntry, params, context);
}
