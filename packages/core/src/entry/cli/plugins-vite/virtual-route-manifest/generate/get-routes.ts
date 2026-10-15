import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { normalizePath, parseSync } from "vite";
import type { WrenConfig } from "#/entry/config/types.js";
import type { Entry, EntryKind, RoutableEntry } from "#/types.js";
import {
  ENTRY_API_EXPORTS,
  ENTRY_FILEROUTE_LAYOUT,
  ENTRY_FILEROUTE_NOT_FOUND,
  ENTRY_FILEROUTE_PROXY,
  ENTRY_FILEROUTE_ROOT,
  ENTRY_KIND_API,
  ENTRY_KIND_LAYOUT,
  ENTRY_KIND_NOT_FOUND,
  ENTRY_KIND_PAGE,
  ENTRY_KIND_PROXY,
  ENTRY_KIND_ROOT,
  ROUTE_MODULE_RE,
} from "#/constants.ts";

const SPECIAL_KINDS = new Map<string, EntryKind>([
  [ENTRY_FILEROUTE_LAYOUT, ENTRY_KIND_LAYOUT],
  [ENTRY_FILEROUTE_NOT_FOUND, ENTRY_KIND_NOT_FOUND],
  [ENTRY_FILEROUTE_PROXY, ENTRY_KIND_PROXY],
  [ENTRY_FILEROUTE_ROOT, ENTRY_KIND_ROOT],
]);
const WRAPPER_STEMS = new Set([
  ENTRY_FILEROUTE_LAYOUT,
  ENTRY_FILEROUTE_PROXY,
  ENTRY_FILEROUTE_ROOT,
]);

const stem = (fileName: string) => fileName.replace(/\.[^/.]+$/, "");

const classifyModule = (fileName: string, exportNames: string[]): EntryKind | undefined => {
  const hasDefault = exportNames.includes("default");
  const hasApi = ENTRY_API_EXPORTS.some((name) => exportNames.includes(name));
  const special = SPECIAL_KINDS.get(stem(fileName));
  if (hasDefault) {
    if (!special) return ENTRY_KIND_PAGE;
    return hasApi ? undefined : special;
  }
  if (!hasApi) return undefined;
  return !special || special === ENTRY_KIND_LAYOUT || special === ENTRY_KIND_ROOT
    ? ENTRY_KIND_API
    : undefined;
};

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

type RouteWrappers = { layouts: Entry[]; proxies: Entry[] };
const EMPTY_WRAPPERS: RouteWrappers = { layouts: [], proxies: [] };

const loadWrappers = async (directory: string): Promise<RouteWrappers> => {
  const files = await readdir(directory, { withFileTypes: true });
  const layouts: Entry[] = [];
  const proxies: Entry[] = [];
  const roots: Entry[] = [];

  await Promise.all(
    files
      .filter((file) => isRouteModule(file) && WRAPPER_STEMS.has(stem(file.name)))
      .map(async (file) => {
        const filePath = resolve(directory, file.name);
        const kind = classifyModule(file.name, await getExportNames(filePath));
        if (kind === ENTRY_KIND_LAYOUT) layouts.push({ file: filePath, kind });
        else if (kind === ENTRY_KIND_PROXY) proxies.push({ file: filePath, kind });
        else if (kind === ENTRY_KIND_ROOT) roots.push({ file: filePath, kind });
      }),
  );

  return { layouts: [...layouts, ...roots], proxies };
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

const ROUTE_GROUP_RE = /\/\([^/]+\)(?=\/|$)/g;
const toRoutePattern = (pagesDir: string, file: string) => {
  const params: string[] = [];
  const pattern = file
    .slice(pagesDir.length)
    .replace(/\.[^/.]+$/, "")
    .replace(/\/(?:index|__not-found)$/, "")
    .replaceAll(/\[(\.\.\.)?([^[\]]+)\]/g, (_, dots, name: string) => {
      params.push(name);
      return dots ? `:${name}*` : `:${name}`;
    })
    .replaceAll(ROUTE_GROUP_RE, "");
  return { params, pattern: pattern || "/" };
};

const toEntry = async (
  getWrappers: ReturnType<typeof createGetWrappers>,
  pagesDir: string,
  file: Dirent,
): Promise<Entry | undefined> => {
  const fullPath = normalizePath(`${file.parentPath}/${file.name}`);
  const kind = classifyModule(file.name, await getExportNames(fullPath));
  if (kind !== ENTRY_KIND_API && kind !== ENTRY_KIND_NOT_FOUND && kind !== ENTRY_KIND_PAGE) {
    return undefined;
  }

  const { params, pattern } = toRoutePattern(pagesDir, fullPath);
  if (kind !== ENTRY_KIND_PAGE) return { file: fullPath, kind, params, pattern };
  const { layouts, proxies } = await getWrappers(fullPath);
  return { file: fullPath, kind, layouts, params, pattern, proxies };
};

export const getRoutes = async (config: WrenConfig, root: string): Promise<RoutableEntry> => {
  const pagesDir = resolve(root, config.router!);
  const files = await readdir(pagesDir, { recursive: true, withFileTypes: true });
  const getWrappers = createGetWrappers(pagesDir);
  const entries = await Promise.all(
    files.filter(isRouteModule).map(async (file) => toEntry(getWrappers, pagesDir, file)),
  );

  const notFounds: Entry[] = [];
  const routes: Entry[] = [];
  for (const entry of entries) {
    if (entry) (entry.kind === ENTRY_KIND_NOT_FOUND ? notFounds : routes).push(entry);
  }

  return { notFounds, routes };
};
