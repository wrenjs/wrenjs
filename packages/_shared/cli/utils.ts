import type { parseSync, Rolldown } from "vite";
import { basename, extname } from "node:path";
import { normalizePath } from "vite";

type StaticExports = ReturnType<typeof parseSync>["module"]["staticExports"];

export const NODE_MODULES_RE = /\/node_modules\//;

export const routerFileFilter = (router: string, extensions: RegExp): RegExp => {
  const directory = normalizePath(router)
    .split("/")
    .filter((segment) => segment !== "" && segment !== "." && segment !== "..")
    .join("/");
  const prefix = directory
    ? `(?:^|/)${directory.replaceAll(/[$()*+.?[\\\]^{|}]/g, "\\$&")}/.*`
    : "";
  return new RegExp(`${prefix}${extensions.source}`);
};

export const stem = (file: string): string => basename(file, extname(file));

const PATH_ENCODE_RE = /[\p{Cc} "#<>?^`{}\u0080-\u{10FFFF}]+/gu;

export const encodePath = (path: string): string =>
  path
    .toWellFormed()
    .normalize("NFC")
    .replaceAll(PATH_ENCODE_RE, (chars) => encodeURIComponent(chars));

export const sortedRecord = <T>(entries: [string, T][]): Record<string, T> =>
  Object.fromEntries(entries.toSorted(([a], [b]) => (a < b ? -1 : 1)));

export const forEachLimit = async <T>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<void>,
): Promise<void> => {
  let next = 0;
  let failed = false;
  const worker = async () => {
    while (!failed && next < items.length) {
      const item = items[next++];
      try {
        // oxlint-disable-next-line no-await-in-loop -- Workers deliberately process items serially.
        await task(item);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
};

export const preloadModule = async (context: Rolldown.PluginContext, id: string): Promise<void> => {
  const resolved = await context.resolve(id, undefined, { skipSelf: false });
  if (resolved) await context.load({ id: resolved.id });
};

export const hasNamespaceExport = (staticExports: StaticExports): boolean =>
  staticExports.some(({ entries }) =>
    entries.some(({ importName: { kind } }) => kind === "All" || kind === "AllButDefault"),
  );

export const staticExportNames = (staticExports: StaticExports): string[] => {
  const names: string[] = [];
  for (const { entries } of staticExports) {
    for (const { exportName, isType } of entries) {
      if (isType) continue;
      const name = exportName.kind === "Default" ? "default" : exportName.name;
      if (name !== null) names.push(name);
    }
  }
  return names;
};
