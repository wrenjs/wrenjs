import type { Plugin } from "vite";
import { type Dirent, globSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { normalizePath, parseSync } from "vite";
import {
  ISLAND_SCRIPT_MODULE,
  PAGE_SCRIPT_HOIST_PREFIX,
  PAGE_SCRIPT_URL_PREFIX,
  SOURCE_RE,
} from "../../../constants.ts";
import { escapeGlob, hasNamespaceExport, preloadModule, staticExportNames } from "../../utils.ts";

type ParseResult = ReturnType<typeof parseSync>;

const DIRECTIVE = "use client";

const IMPL_QUERY = "?wren-island-impl";
const IMPL_RE = /\?wren-island-impl\.[cm]?[jt]sx?$/;

const hasDirective = ({ errors, program }: ParseResult) =>
  errors.length === 0 &&
  program.body.some(
    (statement) => statement.type === "ExpressionStatement" && statement.directive === DIRECTIVE,
  );

const findIslands = async (root: string, outDir: string): Promise<string[]> => {
  const exclude = (entry: Dirent) =>
    entry.isDirectory() &&
    (entry.name === "node_modules" ||
      entry.name.startsWith(".") ||
      join(entry.parentPath, entry.name) === outDir);
  const entries = globSync("**/*", { cwd: root, exclude, withFileTypes: true });
  const islands = await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isFile() || !SOURCE_RE.test(entry.name)) return [];
      const file = join(entry.parentPath, entry.name);
      const code = await readFile(file, "utf8");
      return code.includes(DIRECTIVE) && hasDirective(parseSync(file, code)) ? [file] : [];
    }),
  );
  return islands.flat();
};

export const pluginWrenIslands = (options: {
  runtimeEntry: string;

  wrapperImport: string;
}): Plugin => {
  const implIds = new Set<string>();
  let root: string;
  let outDir: string;
  return {
    async buildStart() {
      if (this.environment.config.consumer !== "server") return;
      await preloadModule(this, ISLAND_SCRIPT_MODULE);
    },
    config(config) {
      root = resolve(config.root ?? ".");
      outDir = resolve(root, config.build?.outDir ?? "dist");
    },
    async configEnvironment(_name, { build, consumer, input }, { command }) {
      if (command !== "serve" || consumer !== "client") return undefined;
      const islands = await findIslands(root, outDir);
      if (islands.length === 0) return undefined;
      const entry = input ?? build?.rolldownOptions?.input;
      const inputs = typeof entry === "string" ? [entry] : Object.values(entry ?? {});
      return {
        optimizeDeps: {
          entries: [...inputs, ...islands].map((path) => escapeGlob(normalizePath(path))),
        },
      };
    },
    enforce: "pre",
    load: {
      filter: { id: IMPL_RE },
      handler(id) {
        if (this.environment.config.consumer !== "server" || !implIds.has(id)) return null;
        return readFile(id.slice(0, id.indexOf(IMPL_QUERY)), "utf8");
      },
    },
    name: "wrenjs-islands",
    resolveId: {
      filter: { id: [new RegExp(`^${ISLAND_SCRIPT_MODULE}$`), IMPL_RE] },
      handler(source) {
        if (source === ISLAND_SCRIPT_MODULE) {
          return `\0${PAGE_SCRIPT_URL_PREFIX}${options.runtimeEntry}`;
        }
        return implIds.has(source) ? source : null;
      },
    },
    transform: {
      filter: {
        code: DIRECTIVE,
        id: { exclude: [IMPL_RE, /\/node_modules\//], include: SOURCE_RE },
      },
      handler(code, id) {
        if (this.environment.config.consumer !== "server") return null;
        const parsed = parseSync(id, code);
        if (!hasDirective(parsed)) return null;
        if (hasNamespaceExport(parsed.module.staticExports)) {
          throw new Error(`[wrenjs] "${DIRECTIVE}" modules cannot use "export *" (${id}).`);
        }

        const impl = `${id}${IMPL_QUERY}${extname(id)}`;
        implIds.add(impl);
        const exports = staticExportNames(parsed.module.staticExports).map((name) => {
          const value = `island(impl[${JSON.stringify(name)}], url, ${JSON.stringify(name)})`;
          return name === "default"
            ? `export default ${value};`
            : `export const ${name} = ${value};`;
        });
        return {
          code: [
            `import ${JSON.stringify(PAGE_SCRIPT_HOIST_PREFIX + ISLAND_SCRIPT_MODULE)};`,
            `import * as impl from ${JSON.stringify(impl)};`,
            `import url from ${JSON.stringify(PAGE_SCRIPT_URL_PREFIX + id)};`,
            `import { island } from ${JSON.stringify(options.wrapperImport)};`,
            ...exports,
          ].join("\n"),
          map: null,
        };
      },
    },
  };
};
