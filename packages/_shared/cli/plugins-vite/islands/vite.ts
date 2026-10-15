import type { Plugin } from "vite";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { parseSync } from "vite";
import {
  ISLAND_SCRIPT_MODULE,
  PAGE_SCRIPT_HOIST_PREFIX,
  PAGE_SCRIPT_URL_PREFIX,
  SOURCE_RE,
} from "../../../constants.ts";

type ParseResult = ReturnType<typeof parseSync>;

const DIRECTIVE = "use client";

const IMPL_QUERY = "?wren-island-impl";
const IMPL_RE = /\?wren-island-impl\.[cm]?[jt]sx?$/;

const hasDirective = ({ program }: ParseResult) =>
  program.body.some(
    (statement) => statement.type === "ExpressionStatement" && statement.directive === DIRECTIVE,
  );

const exportNames = ({ module }: ParseResult, id: string) => {
  const names: string[] = [];
  for (const { entries } of module.staticExports) {
    for (const { exportName, importName, isType } of entries) {
      if (importName.kind === "All" || importName.kind === "AllButDefault") {
        throw new Error(`[wrenjs] "${DIRECTIVE}" modules cannot use "export *" (${id}).`);
      }
      if (isType) continue;
      const name = exportName.kind === "Default" ? "default" : exportName.name;
      if (name !== null) names.push(name);
    }
  }
  return names;
};

export const pluginWrenIslands = (options: {
  runtimeEntry: string;

  wrapperImport: string;
}): Plugin => {
  const implIds = new Set<string>();
  return {
    async buildStart() {
      if (this.environment.config.consumer !== "server") return;

      const resolved = await this.resolve(ISLAND_SCRIPT_MODULE, undefined, { skipSelf: false });
      if (resolved) await this.load({ id: resolved.id });
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
        if (parsed.errors.length > 0 || !hasDirective(parsed)) return null;

        const impl = `${id}${IMPL_QUERY}${extname(id)}`;
        implIds.add(impl);
        const exports = exportNames(parsed, id).map((name) => {
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
