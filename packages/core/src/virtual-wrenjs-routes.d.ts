declare module "virtual:wrenjs-routes" {
  export type Entry = import("./types.js").RouteEntry;
  export type RadixTrie = import("./types.js").RadixTrie<Entry>;

  export const dynamicNotFounds: RadixTrie;
  export const dynamicRoutes: RadixTrie;
  export const staticNotFounds: Record<string, Entry> | undefined;
  export const staticRoutes: Record<string, Entry> | undefined;
}
