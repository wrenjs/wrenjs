import type { WrenConfig } from "#/entry/config/types.js";
import type { Entry } from "#/types.js";
import { encodePath } from "#shared/cli/utils.ts";
import { getRoutes, type RouteClassificationCache } from "./get-routes.ts";
import { createRadixTrie } from "./radix-trie.ts";

const partition = (routes: Entry[]) => {
  const dynamicRoutes: Record<string, Entry> = {};
  const staticRoutes: Record<string, Omit<Entry, "params" | "pattern">> = {};
  for (const route of routes) {
    const { params, pattern, ...staticRoute } = route;
    const isDynamic = params !== undefined && params.length > 0;
    const key = isDynamic ? pattern! : encodePath(pattern!);
    const existing = isDynamic ? dynamicRoutes[key] : staticRoutes[key];
    if (existing) throw new Error(`"${route.file}" conflicts with "${existing.file}".`);
    if (isDynamic) dynamicRoutes[key] = route;
    else staticRoutes[key] = staticRoute;
  }
  return [createRadixTrie(dynamicRoutes), staticRoutes] as const;
};

export const generateRouteManifest = async (
  config: WrenConfig,
  root: string,
  cache: RouteClassificationCache,
) => {
  const { notFounds, routes } = await getRoutes(config, root, cache);
  const [dynamicNotFounds, staticNotFounds] = partition(notFounds);
  const [dynamicRoutes, staticRoutes] = partition(routes);
  return { dynamicNotFounds, dynamicRoutes, staticNotFounds, staticRoutes };
};
