import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
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
import { staticExportNames, stem } from "#shared/cli/utils.ts";

type Wrappers = Pick<Required<Entry>, "layouts" | "proxies">;

const SPECIAL_KINDS = new Map<string, EntryKind>([
  [ENTRY_FILEROUTE_LAYOUT, ENTRY_KIND_LAYOUT],
  [ENTRY_FILEROUTE_NOT_FOUND, ENTRY_KIND_NOT_FOUND],
  [ENTRY_FILEROUTE_PROXY, ENTRY_KIND_PROXY],
  [ENTRY_FILEROUTE_ROOT, ENTRY_KIND_ROOT],
]);
const EMPTY_WRAPPERS: Wrappers = { layouts: [], proxies: [] };
const ROUTE_GROUP_RE = /\/\([^/]+\)(?=\/|$)/g;

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

const classifyFile = async (file: Dirent): Promise<Entry | undefined> => {
  const fullPath = normalizePath(`${file.parentPath}/${file.name}`);
  const { errors, module } = parseSync(fullPath, await readFile(fullPath, "utf8"));
  if (errors.length > 0) {
    throw new SyntaxError(
      `Cannot parse ${fullPath}: ${errors.map((error) => error.message).join("\n")}`,
    );
  }
  const kind = classifyModule(file.name, staticExportNames(module.staticExports));
  return kind && { file: fullPath, kind };
};

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

export const getRoutes = async (config: WrenConfig, root: string): Promise<RoutableEntry> => {
  const pagesDir = normalizePath(resolve(root, config.router!));
  const files = await readdir(pagesDir, { recursive: true, withFileTypes: true });
  const classified = await Promise.all(files.filter(isRouteModule).map(classifyFile));
  const entries = classified.filter((entry) => entry !== undefined);

  const wrappers = new Map<string, Wrappers & { roots: Entry[] }>();
  for (const entry of entries) {
    const { kind } = entry;
    if (kind !== ENTRY_KIND_LAYOUT && kind !== ENTRY_KIND_PROXY && kind !== ENTRY_KIND_ROOT) {
      continue;
    }
    const directory = dirname(entry.file);
    const own = wrappers.get(directory) ?? { layouts: [], proxies: [], roots: [] };
    wrappers.set(directory, own);
    if (kind === ENTRY_KIND_LAYOUT) own.layouts.push(entry);
    else if (kind === ENTRY_KIND_PROXY) own.proxies.push(entry);
    else own.roots.push(entry);
  }

  const chains = new Map<string, Wrappers>();
  const chainFor = (directory: string): Wrappers => {
    let chain = chains.get(directory);
    if (!chain) {
      const parent = directory === pagesDir ? EMPTY_WRAPPERS : chainFor(dirname(directory));
      const { layouts = [], proxies = [], roots = [] } = wrappers.get(directory) ?? {};
      chain = {
        layouts: [...layouts, ...roots, ...parent.layouts],
        proxies: [...proxies, ...parent.proxies],
      };
      chains.set(directory, chain);
    }
    return chain;
  };

  const notFounds: Entry[] = [];
  const routes: Entry[] = [];
  for (const { file, kind } of entries) {
    if (kind === ENTRY_KIND_PAGE) {
      routes.push({ file, kind, ...toRoutePattern(pagesDir, file), ...chainFor(dirname(file)) });
    } else if (kind === ENTRY_KIND_API || kind === ENTRY_KIND_NOT_FOUND) {
      (kind === ENTRY_KIND_API ? routes : notFounds).push({
        file,
        kind,
        ...toRoutePattern(pagesDir, file),
        proxies: chainFor(dirname(file)).proxies,
      });
    }
  }
  return { notFounds, routes };
};
