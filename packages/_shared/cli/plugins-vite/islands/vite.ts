import type { Plugin } from "vite";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { parseSync } from "vite/rolldown/utils";
import {
  ISLAND_SCRIPT_MODULE,
  PAGE_SCRIPT_HOIST_PREFIX,
  PAGE_SCRIPT_URL_PREFIX,
} from "../../../constants.ts";

type Declaration = Extract<
  ReturnType<typeof parseSync>["program"]["body"][number],
  { type: "ExportNamedDeclaration" }
>["declaration"];
type Program = ReturnType<typeof parseSync>["program"];

const DIRECTIVE = "use client";
/** The untransformed component module behind a facade; keeps the extension so JSX transforms apply. */
const IMPL_QUERY = "?wren-island-impl";
const IMPL_RE = /\?wren-island-impl\.[cm]?[jt]sx?$/;
const SOURCE_RE = /\.[cm]?[jt]sx?$/;
/** Impl ids emitted by `transform`; the only ones `resolveId`/`load` may honour. */
const implIds = new Set<string>();

const hasDirective = (program: Program) =>
  program.body.some(
    (statement) => statement.type === "ExpressionStatement" && statement.directive === DIRECTIVE,
  );

const declarationNames = (declaration: NonNullable<Declaration>, id: string): string[] => {
  if (declaration.type !== "VariableDeclaration") {
    return "id" in declaration && declaration.id?.type === "Identifier"
      ? [declaration.id.name]
      : [];
  }
  return declaration.declarations.map(({ id: pattern }) => {
    if (pattern.type !== "Identifier") {
      throw new Error(
        `[wrenjs] Destructured exports are not supported in "${DIRECTIVE}" modules (${id}).`,
      );
    }
    return pattern.name;
  });
};

/** Names of a module's exports; `export *` cannot be enumerated and is rejected. */
const exportNames = (program: Program, id: string) => {
  const names: string[] = [];
  for (const statement of program.body) {
    if (statement.type === "ExportAllDeclaration") {
      throw new Error(`[wrenjs] "${DIRECTIVE}" modules cannot use "export *" (${id}).`);
    }
    if (statement.type === "ExportDefaultDeclaration") names.push("default");
    if (statement.type !== "ExportNamedDeclaration") continue;
    for (const { exported } of statement.specifiers) {
      names.push(exported.type === "Identifier" ? exported.name : exported.value);
    }
    if (statement.declaration) names.push(...declarationNames(statement.declaration, id));
  }
  return names;
};

/**
 * Islands: component modules that start with `"use client"`. In server environments the
 * module becomes a facade whose exports render a `<wren-island>` around the real component
 * (via the integration's `island()` wrapper); the client environment bundles the module
 * untouched, through the page-script registry, which also provides its URL.
 */
export const pluginWrenIslands = (options: {
  /** Browser runtime defining `<wren-island>`; emitted once per page that renders an island. */
  runtimeEntry: string;
  /** Module exporting `island(Component, src, exportName)` for the integration's renderer. */
  wrapperImport: string;
}): Plugin => ({
  async buildStart() {
    if (this.environment.config.consumer !== "server") return;
    // Register the runtime before the client environment builds (same as Wren Link).
    // `skipSelf` defaults to true, and this plugin is the one resolving the module.
    const resolved = await this.resolve(ISLAND_SCRIPT_MODULE, undefined, { skipSelf: false });
    if (resolved) await this.load({ id: resolved.id });
  },
  enforce: "pre",
  load: {
    filter: { id: IMPL_RE },
    handler(id) {
      // Never serve to the browser or for ids this plugin did not emit (arbitrary file read).
      if (this.environment.config.consumer !== "server" || !implIds.has(id)) return null;
      return readFile(id.slice(0, id.indexOf(IMPL_QUERY)), "utf8");
    },
  },
  name: "wrenjs-islands",
  resolveId(source) {
    if (source === ISLAND_SCRIPT_MODULE) {
      return `\0${PAGE_SCRIPT_URL_PREFIX}${options.runtimeEntry}`;
    }
    return implIds.has(source) ? source : null;
  },
  transform: {
    filter: { code: DIRECTIVE, id: { exclude: IMPL_RE, include: SOURCE_RE } },
    handler(code, id) {
      if (this.environment.config.consumer !== "server") return null;
      if (id.includes("/node_modules/")) return null;
      const { errors, program } = parseSync(id, code);
      if (errors.length > 0 || !hasDirective(program)) return null;

      const impl = `${id}${IMPL_QUERY}${extname(id)}`;
      implIds.add(impl);
      const exports = exportNames(program, id).map((name) => {
        const value = `island(impl[${JSON.stringify(name)}], url, ${JSON.stringify(name)})`;
        return name === "default" ? `export default ${value};` : `export const ${name} = ${value};`;
      });
      return {
        code: [
          // Pages rendering an island get the `<wren-island>` runtime hoisted as a page script.
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
});
