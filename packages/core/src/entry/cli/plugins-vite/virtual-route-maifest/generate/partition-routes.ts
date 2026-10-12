import type { Entry, RoutableEntry } from "#/types.js";

const partition = async (
  routes?: readonly Entry[],
): Promise<{
  dynamicRoutes: Record<string, Entry> | undefined;
  staticRoutes: Record<string, Omit<Entry, "params" | "pattern">> | undefined;
}> => {
  if (!routes) return { dynamicRoutes: undefined, staticRoutes: undefined };

  const staticRoutes: Record<string, Omit<Entry, "params" | "pattern">> = {};
  const dynamicRoutes: Record<string, Entry> = {};

  for (const route of routes) {
    const { params, pattern, ...staticRoute } = route;
    if (params?.length) {
      // TODO?: NOTE: `pattern` should exist by this point.
      dynamicRoutes[pattern!] = route;
    } else {
      staticRoutes[pattern!] = staticRoute;
    }
  }

  return { dynamicRoutes, staticRoutes };
};

export const partitionRoutes = async (routableEntries: RoutableEntry) => {
  const [
    { dynamicRoutes, staticRoutes },
    { dynamicRoutes: dynamicNotFounds, staticRoutes: staticNotFounds },
  ] = await Promise.all([partition(routableEntries.routes), partition(routableEntries.notFounds)]);

  return { dynamicNotFounds, dynamicRoutes, staticNotFounds, staticRoutes };
};
