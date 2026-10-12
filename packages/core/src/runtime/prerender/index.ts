import { extractPathname } from "#shared/utils.ts";
import type { RadixTrie, RouteEntry } from "#/types.js";

function* entries(trie: RadixTrie<RouteEntry>): Generator<RouteEntry> {
  if (trie.e) yield trie.e;
  if (trie.w) yield trie.w;
  for (const child of Object.values(trie.s)) yield* entries(child);
  if (trie.p) yield* entries(trie.p);
  for (const edge of trie.m ?? []) yield* entries(edge.node);
}

const selectedPaths = async (
  route: RouteEntry,
  pattern: string | undefined,
  prerenderAll: boolean,
): Promise<string[]> => {
  if (route.kind !== "PAGE") return [];
  const modules = await Promise.all([
    route.module(),
    ...(route.layouts?.map((load) => load()) ?? []),
  ]);
  if (!prerenderAll && !modules.some((module) => module.config?.prerender === true)) return [];
  if (!route.params?.length) {
    if (!pattern) throw new Error("A static prerender route must have a pathname.");
    return [pattern];
  }
  const [module] = modules;
  if (!module.getStaticPaths) {
    throw new Error(`Prerendered route ${pattern} must export getStaticPaths().`);
  }
  return module.getStaticPaths();
};

export const getPrerenderPaths = async (
  manifest: {
    dynamicRoutes: RadixTrie<RouteEntry>;
    staticRoutes?: Record<string, RouteEntry>;
  },
  prerenderAll = false,
): Promise<string[]> => {
  const { dynamicRoutes, staticRoutes = {} } = manifest;
  const candidates = await Promise.all([
    ...Object.entries(staticRoutes).map(([pattern, route]) =>
      selectedPaths(route, pattern, prerenderAll),
    ),
    ...Array.from(entries(dynamicRoutes), (route) =>
      selectedPaths(route, route.pattern, prerenderAll),
    ),
  ]);
  return [...new Set(candidates.flat().map((candidate) => extractPathname(candidate)!))];
};
