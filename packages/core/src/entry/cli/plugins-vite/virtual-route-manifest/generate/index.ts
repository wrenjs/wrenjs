import type { WrenConfig } from "#/entry/config/types.js";
import type { Entry } from "#/types.js";
import { getRoutes } from "./get-routes.ts";
import { createRadixTrie } from "./radix-trie.ts";

const partition = (routes: Entry[]) => {
  const dynamicRoutes: Record<string, Entry> = {};
  const staticRoutes: Record<string, Omit<Entry, "params" | "pattern">> = {};
  for (const route of routes) {
    const { params, pattern, ...staticRoute } = route;
    if (params?.length) dynamicRoutes[pattern!] = route;
    else staticRoutes[pattern!] = staticRoute;
  }
  return [createRadixTrie(dynamicRoutes), staticRoutes] as const;
};

export const generateRouteManifest = async (config: WrenConfig, root: string) => {
  const { notFounds, routes } = await getRoutes(config, root);
  const [dynamicNotFounds, staticNotFounds] = partition(notFounds);
  const [dynamicRoutes, staticRoutes] = partition(routes);
  return { dynamicNotFounds, dynamicRoutes, staticNotFounds, staticRoutes };
};
