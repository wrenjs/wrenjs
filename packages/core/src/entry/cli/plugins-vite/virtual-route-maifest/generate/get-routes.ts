import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { normalizePath } from "vite";
import { parseSync } from "vite/rolldown/utils";
import type { WrenConfig } from "#/entry/config/types.js";
import type { Entry, EntryKind, RoutableEntry } from "#/types.js";
import {
  ENTRY_API_EXPORTS,
  ENTRY_FILEROUTE_PROXY,
  ENTRY_FILEROUTE_ROOT_LAYOUT,
  ENTRY_KIND_API,
  ENTRY_KIND_PROXY,
  FALLBACK_ENTRIES,
  ROUTE_ENTRIES,
  ROUTE_MODULE_RE,
} from "#/constants.ts";
import {
  ENTRY_FILEROUTE_LAYOUT,
  ENTRY_FILEROUTE_NOT_FOUND,
  ENTRY_FILEROUTE_ROOT,
  ENTRY_KIND_LAYOUT,
  ENTRY_KIND_NOT_FOUND,
  ENTRY_KIND_PAGE,
  ENTRY_KIND_ROOT,
} from "#/constants.ts";

const MAPPING = {
  0: undefined,
  1: ENTRY_KIND_PAGE,
  10: ENTRY_KIND_API,
  11: ENTRY_KIND_PAGE,
  100: undefined, // has the name, but no default export.
  101: ENTRY_KIND_LAYOUT,
  110: ENTRY_KIND_API, // NOTE: This means it's a layout with API export, no default. Could be useful?
  200: undefined,
  201: ENTRY_KIND_NOT_FOUND,
  210: undefined,
  300: undefined,
  301: ENTRY_KIND_PROXY,
  310: undefined,
  1000: undefined,
  1001: ENTRY_KIND_ROOT,
  1010: ENTRY_KIND_API,
} as Record<number, EntryKind | undefined>;

const classifyModule = (fileName: string, exportNames: string[]): EntryKind | undefined => {
  const hasDefault = exportNames.includes("default");
  const hasApiExport = ENTRY_API_EXPORTS.some((name) => exportNames.includes(name));
  const fileNameNoExt = fileName.replace(/\.[^/.]+$/, "");

  // NOTE: Idk if it's good or not but I don't like sequentially going through many ifs to find which one is correct,
  // instead the type is "encoded" somehow and keyed off of directly.
  const boolSum =
    Number(hasDefault) +
    10 * Number(hasApiExport) +
    100 * Number(fileNameNoExt === ENTRY_FILEROUTE_LAYOUT) +
    200 * Number(fileNameNoExt === ENTRY_FILEROUTE_NOT_FOUND) +
    300 * Number(fileNameNoExt === ENTRY_FILEROUTE_PROXY) +
    1000 * Number(fileNameNoExt === ENTRY_FILEROUTE_ROOT);
  return MAPPING[boolSum] || undefined;
};

let id = 0;

const isRouteModule = (file: Dirent) => file.isFile() && ROUTE_MODULE_RE.test(file.name);

const getExportNames = async (fullPath: string): Promise<string[]> => {
  const { errors, module } = parseSync(fullPath, await readFile(fullPath, "utf8"));
  if (errors.length > 0) {
    throw new SyntaxError(
      `Cannot parse ${fullPath}: ${errors.map((error) => error.message).join("\n")}`,
    );
  }

  return module.staticExports.reduce<string[]>((names, declaration) => {
    for (const entry of declaration.entries) {
      if (entry.isType) continue;
      const name = entry.exportName.kind === "Default" ? "default" : entry.exportName.name;
      if (name !== null) names.push(name);
    }
    return names;
  }, []);
};

// Check for relevant layouts, middlewares, and other route-related modules.
const VALID_WRAPPERS = [
  ENTRY_FILEROUTE_ROOT_LAYOUT,
  ENTRY_FILEROUTE_LAYOUT,
  ENTRY_FILEROUTE_PROXY,
] as const;
type RouteWrappers = { layouts: Entry[]; proxies: Entry[] };
const EMPTY_WRAPPERS: RouteWrappers = { layouts: [], proxies: [] };

const loadWrappers = async (directory: string): Promise<RouteWrappers> => {
  const files = await readdir(directory, { withFileTypes: true });
  const layouts: Entry[] = [];
  const proxies: Entry[] = [];

  await Promise.all(
    files
      .filter(
        (item) =>
          isRouteModule(item) &&
          VALID_WRAPPERS.some(
            (prefix) => item.name.startsWith(prefix) || !item.name.startsWith("_"),
          ),
      )
      .map(async (file) => {
        const filePath = resolve(directory, file.name);
        const kind = classifyModule(file.name, await getExportNames(filePath));
        switch (kind) {
          case ENTRY_KIND_LAYOUT:
            layouts.push({ file: filePath, id: id++, kind });
            break;
          case ENTRY_KIND_PROXY:
            proxies.push({ file: filePath, id: id++, kind });
            break;
          case ENTRY_KIND_ROOT:
            // Root layout is treated as a layout as well
            layouts.push({ file: filePath, id: id++, kind });
            break;
        }
      }),
  );

  return {
    layouts: layouts.toSorted(
      (a, b) => Number(a.kind === ENTRY_KIND_ROOT) - Number(b.kind === ENTRY_KIND_ROOT),
    ),
    proxies,
  };
};

const createGetWrappers = (pagesRoot: string) => {
  const cache = new Map<string, Promise<RouteWrappers>>();
  const rootDirectory = resolve(pagesRoot);
  const rootPrefix = rootDirectory.endsWith("/") ? rootDirectory : `${rootDirectory}/`;

  const getDirectoryWrappers = (directory: string): Promise<RouteWrappers> => {
    if (directory !== rootDirectory && !directory.startsWith(rootPrefix)) {
      return Promise.resolve(EMPTY_WRAPPERS);
    }

    const cached = cache.get(directory);
    if (cached) return cached;

    const pending = Promise.all([
      loadWrappers(directory),
      directory === rootDirectory
        ? Promise.resolve(EMPTY_WRAPPERS)
        : getDirectoryWrappers(resolve(directory, "..")),
    ]).then(([wrappers, parentWrappers]) => ({
      layouts: [...wrappers.layouts, ...parentWrappers.layouts],
      proxies: [...wrappers.proxies, ...parentWrappers.proxies],
    }));

    cache.set(directory, pending);
    return pending;
  };

  return (fullPath: string): Promise<RouteWrappers> =>
    getDirectoryWrappers(resolve(fullPath, ".."));
};

const ROUTE_GROUP_RE = /\/\(([^/]+)\)(?=\/|$)/g;
const toRoutePattern = (pagesDir: string, file: string) => {
  const routeGroups: string[] = [];
  const params: string[] = [];
  const norm = file
    .slice(pagesDir.length)
    .replace(/\.[^/.]+$/, "")
    .replace(/\/(?:index|__not-found)$/, "")
    .replaceAll(/\[(\.\.\.)?([^[\]]+)\]/g, (_, dots, name: string) => {
      params.push(name);
      return dots ? `:${name}*` : `:${name}`;
    });

  const stripped = norm.replace(ROUTE_GROUP_RE, (_, g) => {
    routeGroups.push(g);
    return "";
  });
  const pattern = stripped || "/";
  return {
    groups: routeGroups.length > 0 ? routeGroups : undefined,
    params,
    pattern,
  };
};

const INTERESTED_MANIFEST_ENTRIES: ReadonlySet<EntryKind> = new Set([
  ENTRY_KIND_API,
  ENTRY_KIND_NOT_FOUND,
  ENTRY_KIND_PAGE,
]);
const toEntry = async (
  getWrappers: ReturnType<typeof createGetWrappers>,
  pagesDir: string,
  file: Dirent,
): Promise<Entry | undefined> => {
  const fullPath = normalizePath(`${file.parentPath}/${file.name}`);
  // Inspect declarations without executing pages or resolving framework imports.
  const exportNames = await getExportNames(fullPath);
  const kind = classifyModule(file.name, exportNames);
  if (!kind || !INTERESTED_MANIFEST_ENTRIES.has(kind)) return undefined;

  const wrappers = await getWrappers(fullPath);
  // NOTE: wrappers is already in order.
  const isPage = kind === ENTRY_KIND_PAGE;
  const { groups = [], params, pattern } = toRoutePattern(pagesDir, fullPath);

  return {
    file: fullPath, // the source file itself
    groups,
    id: id++, // unique identifier for the entry
    kind,
    layouts: isPage ? wrappers.layouts : undefined, // the source file and its "wrapping" module(s).
    params,
    pattern,
    proxies: isPage ? wrappers.proxies : undefined,
  };
};

export const getRoutes = async (config: WrenConfig, root: string): Promise<RoutableEntry> => {
  const pagesDir = resolve(root, config.router ?? "src/pages");
  const files = await readdir(pagesDir, { recursive: true, withFileTypes: true });
  const getWrappers = createGetWrappers(pagesDir);
  const classifiedEntries = await Promise.all(
    files.filter(isRouteModule).map(async (file) => toEntry(getWrappers, pagesDir, file)),
  );

  const notFounds: Entry[] = [];
  const routes: Entry[] = [];
  for (const entry of classifiedEntries) {
    if (!entry) continue;
    if (FALLBACK_ENTRIES.has(entry.kind)) notFounds.push(entry);
    if (ROUTE_ENTRIES.has(entry.kind)) routes.push(entry);
  }

  return { notFounds, routes };
};
