import type { WrenConfig } from "#/entry/config/types.js";
import { getRoutes } from "./get-routes.ts";
import { partitionRoutes } from "./partition-routes.ts";
import { createRadixTrie } from "./radix-trie.ts";

export const generateRouteManifest = async (config: WrenConfig, root: string) => {
  const routes = await getRoutes(config, root);
  const { dynamicNotFounds, dynamicRoutes, staticNotFounds, staticRoutes } =
    await partitionRoutes(routes);

  const manifest = {
    dynamicNotFounds: createRadixTrie(dynamicNotFounds),
    dynamicRoutes: createRadixTrie(dynamicRoutes),
    staticNotFounds: staticNotFounds,
    staticRoutes: staticRoutes,
  };
  return manifest;
};
