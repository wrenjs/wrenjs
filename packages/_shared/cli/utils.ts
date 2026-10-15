import type { parseSync, Rolldown } from "vite";
import { basename, extname } from "node:path";

type StaticExports = ReturnType<typeof parseSync>["module"]["staticExports"];

export const stem = (file: string): string => basename(file, extname(file));

export const sortedRecord = <T>(entries: [string, T][]): Record<string, T> =>
  Object.fromEntries(entries.toSorted(([a], [b]) => (a < b ? -1 : 1)));

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
