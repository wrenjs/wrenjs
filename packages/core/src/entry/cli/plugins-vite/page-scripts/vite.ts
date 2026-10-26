import type { DevEnvironment, Plugin, Rolldown } from "vite";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { isCSSRequest, normalizePath } from "vite";
import { WREN_NAME } from "#/constants.ts";
import { applyEdits, countLines, replaceLines } from "#shared/cli/edits.ts";
import { NODE_MODULES_RE, routerFileFilter, sortedRecord, stem } from "#shared/cli/utils.ts";
import {
  EXPORT_SCRIPTS,
  PAGE_SCRIPT_HOIST_PREFIX,
  PAGE_SCRIPT_URL_PREFIX,
  ROUTE_MODULE_RE,
  SOURCE_RE,
} from "#shared/constants.ts";
import { extractPageScripts, type PageScript } from "./extract.ts";

const VIRTUAL_ID = `virtual:${WREN_NAME}-page-scripts`;
const IMPORT_NAME = "__wrenPageScripts";
const ROUTE_PREFIX = `${VIRTUAL_ID}:route:`;
const RESOLVED_ROUTE_PREFIX = `\0${ROUTE_PREFIX}`;
const HOISTED_ID = `\0${PAGE_SCRIPT_HOIST_PREFIX}`;
const INLINE_RE = /\?wren-script=(\d+)\.ts$/;
const MANIFEST_FILE = "__wren-page-scripts.mjs";
const SCRIPT_URL_ID = `\0${PAGE_SCRIPT_URL_PREFIX}`;

interface ScriptTarget {
  id: string;

  key: string;
  name: string;

  reference?: string;

  url?: string;
}

const toKey = (root: string, id: string) => {
  const path = normalizePath(relative(root, id));
  return path.startsWith("../") || isAbsolute(path)
    ? `@fs/${normalizePath(id).replace(/^\//, "")}`
    : path;
};

const resolveTarget = async (
  context: Rolldown.TransformPluginContext,
  script: PageScript,
  id: string,
) => {
  const dropped = script.attributes.filter((attribute) => !/^type\b/.test(attribute));
  if (dropped.length > 0) {
    context.warn(`Page script attributes are dropped when hoisted: ${dropped.join(" ")}`);
  }
  if (script.kind === "inline") {
    return { id: `${id}?wren-script=${script.index}.ts`, name: `${stem(id)}-${script.index}` };
  }
  const resolved = await context.resolve(script.src, id);
  if (!resolved || resolved.external || resolved.id.includes("/node_modules/")) {
    context.warn(`Page script "${script.src}" must resolve to a project file; left as is.`);
    return undefined;
  }
  return { id: resolved.id, name: stem(resolved.id) };
};

const loadInline = async (context: Rolldown.PluginContext, file: string, index: number) => {
  const code = await readFile(file, "utf8");
  const script = extractPageScripts(code, file).scripts.find(
    (candidate) => candidate.kind === "inline" && candidate.index === index,
  );
  if (script?.kind !== "inline") {
    return context.error(`Inline page script #${index} not found in ${file}.`);
  }

  return {
    code: "\n".repeat(countLines(code.slice(0, script.codeStart))) + script.code,
    map: null,
  };
};

export const pluginPageScripts = (router: string): Plugin[] => {
  const registry = new Map<string, ScriptTarget>();
  const consumers = new Set<string>();

  const declared = new Map<string, ScriptTarget[]>();

  const hoisted = new Map<string, Map<string, Set<ScriptTarget>>>();

  const routes = new Map<string, string>();

  const imports = new Map<string, string[]>();
  let pagesDir: string;

  let environments: DevEnvironment[] = [];

  const register = (root: string, target: Pick<ScriptTarget, "id" | "name">) => {
    const key = toKey(root, target.id);
    const entry = registry.get(key) ?? { ...target, key };
    registry.set(key, entry);
    return entry;
  };

  const collect = (root: string, edges: (id: string) => Iterable<string>) => {
    const targets = new Set<ScriptTarget>();
    const visited = new Set<string>();
    const walk = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      for (const target of declared.get(id) ?? []) targets.add(target);
      for (const set of hoisted.get(id)?.values() ?? [])
        for (const target of set) targets.add(target);
      for (const next of edges(id)) walk(next);
    };
    walk(root);
    return [...targets];
  };

  const hoistScripts = async (
    context: Rolldown.TransformPluginContext,
    code: string,
    id: string,
    isServer: boolean,
  ) => {
    const { scripts, warnings } = extractPageScripts(code, id);
    const edits = scripts.map(({ end, replacement, start }) =>
      replaceLines(code, start, end, replacement),
    );

    if (!isServer) return edits;
    for (const warning of warnings) context.warn(warning);
    const resolved = await Promise.all(scripts.map((script) => resolveTarget(context, script, id)));
    const { root } = context.environment.config;
    declared.set(
      id,
      resolved.flatMap((target) => (target ? [register(root, target)] : [])),
    );
    return edits.filter((_, i) => resolved[i]);
  };

  const stamp = (id: string, root: string, isBuild: boolean) => {
    if (!isBuild) {
      return `\nexport const ${EXPORT_SCRIPTS} = async () => (await import(${JSON.stringify(ROUTE_PREFIX + encodeURIComponent(id))})).default;\n`;
    }
    const key = toKey(root, id);
    routes.set(id, key);
    return `\nimport ${IMPORT_NAME} from ${JSON.stringify(VIRTUAL_ID)};export const ${EXPORT_SCRIPTS} = () => ${IMPORT_NAME}.routes[${JSON.stringify(key)}];\n`;
  };

  const loadRouteScripts = (context: Rolldown.PluginContext, route: string) => {
    const targets = collect(route, (id) =>
      environments.flatMap(({ moduleGraph }) => {
        const mod = moduleGraph.getModuleById(id);

        if (mod?.file && isAbsolute(mod.file)) context.addWatchFile(mod.file);
        return Array.from(mod?.importedModules ?? [], (next) => next.id).filter(
          (next): next is string => next !== null && !isCSSRequest(next),
        );
      }),
    );
    const { base } = context.environment.config;
    return `export default ${JSON.stringify(targets.map((target) => base + target.key))};`;
  };

  const plugin = {
    buildApp: {
      async handler(builder) {
        const targets = [...registry.values()];
        const missing = targets.filter((target) => !target.url).map((target) => target.key);
        if (missing.length > 0) {
          throw new Error(
            `[${WREN_NAME}] Page scripts were not bundled by the client environment (server environments must build first): ${missing.join(", ")}`,
          );
        }
        const manifest = {
          routes: sortedRecord(
            Array.from(routes, ([id, key]) => [
              key,
              collect(id, (module) => imports.get(module) ?? []).map((target) => target.url),
            ]),
          ),
          scripts: sortedRecord(targets.map((target) => [target.key, target.url])),
        };
        const source = `export default ${JSON.stringify(manifest)};\n`;
        await Promise.all(
          [...consumers].map(async (name) => {
            const { build, root } = builder.environments[name].config;
            await writeFile(resolve(root, build.outDir, MANIFEST_FILE), source);
          }),
        );
      },
      order: "post",
    },

    buildEnd() {
      if (this.environment.mode !== "build") return;
      for (const id of this.getModuleIds()) {
        const info = this.getModuleInfo(id);
        if (!info) continue;
        const edges = [...info.importedIds, ...info.dynamicallyImportedIds];
        imports.set(id, [...(imports.get(id) ?? []), ...edges]);
      }
    },

    buildStart() {
      const { mode, name } = this.environment;
      if (mode !== "build" || name !== "client") return;
      for (const target of registry.values()) {
        target.reference = this.emitFile({
          id: target.id,

          name: `scripts/${target.name}`,
          preserveSignature: "exports-only",
          type: "chunk",
        });
      }
    },

    configResolved(config) {
      pagesDir = `${normalizePath(resolve(config.root, router))}/`;
    },

    configureServer(server) {
      environments = Object.values(server.environments);
    },

    enforce: "pre",

    generateBundle() {
      if (this.environment.name !== "client") return;
      const { base } = this.environment.config;
      for (const target of registry.values()) {
        if (target.reference) target.url = base + this.getFileName(target.reference);
      }
    },

    hotUpdate({ modules }) {
      for (const { id } of modules) {
        if (!id) continue;
        declared.delete(id);
        hoisted.get(id)?.delete(this.environment.name);
      }
    },

    load: {
      filter: {
        id: [
          INLINE_RE,
          new RegExp(`^${SCRIPT_URL_ID}`),
          new RegExp(`^${RESOLVED_ROUTE_PREFIX}`),
          new RegExp(`^${HOISTED_ID}$`),
        ],
      },
      async handler(id) {
        const { config, mode } = this.environment;
        if (id === HOISTED_ID) return "export {};";
        if (id.startsWith(SCRIPT_URL_ID)) {
          const file = id.slice(SCRIPT_URL_ID.length);
          const { key } = register(config.root, { id: file, name: stem(file) });
          return mode === "build"
            ? `import ${IMPORT_NAME} from ${JSON.stringify(VIRTUAL_ID)};export default ${IMPORT_NAME}.scripts[${JSON.stringify(key)}];`
            : `export default ${JSON.stringify(config.base + key)};`;
        }
        if (id.startsWith(RESOLVED_ROUTE_PREFIX)) {
          return loadRouteScripts(this, decodeURIComponent(id.slice(RESOLVED_ROUTE_PREFIX.length)));
        }
        const match = INLINE_RE.exec(id);
        return match ? loadInline(this, id.slice(0, match.index), Number(match[1])) : null;
      },
    },

    name: `${WREN_NAME}-page-scripts`,

    renderChunk(code, chunk) {
      if (!code.includes(VIRTUAL_ID)) return null;

      if (this.environment.config.build.write) consumers.add(this.environment.name);
      const specifier = normalizePath(relative(dirname(chunk.fileName), MANIFEST_FILE));
      const target = specifier.startsWith(".") ? specifier : `./${specifier}`;
      return { code: code.replaceAll(VIRTUAL_ID, target), map: null };
    },

    resolveId: {
      filter: {
        id: new RegExp(`^(?:${PAGE_SCRIPT_HOIST_PREFIX}|${PAGE_SCRIPT_URL_PREFIX}|${VIRTUAL_ID})`),
      },
      async handler(source, importer) {
        if (source.startsWith(PAGE_SCRIPT_HOIST_PREFIX)) {
          if (importer && this.environment.config.consumer === "server") {
            const resolved = await this.resolve(
              source.slice(PAGE_SCRIPT_HOIST_PREFIX.length),
              importer,
            );
            if (!resolved?.id.startsWith(SCRIPT_URL_ID)) {
              return this.error(`"${source}" must resolve to a Wren page script (${importer}).`);
            }
            const file = resolved.id.slice(SCRIPT_URL_ID.length);
            const target = register(this.environment.config.root, { id: file, name: stem(file) });
            const byEnvironment = hoisted.get(importer) ?? new Map<string, Set<ScriptTarget>>();
            const targets = byEnvironment.get(this.environment.name) ?? new Set<ScriptTarget>();
            hoisted.set(importer, byEnvironment.set(this.environment.name, targets.add(target)));
          }
          return HOISTED_ID;
        }
        if (source.startsWith(PAGE_SCRIPT_URL_PREFIX) || source.startsWith(ROUTE_PREFIX)) {
          return `\0${source}`;
        }

        return source === VIRTUAL_ID ? { external: true, id: source } : null;
      },
    },

    sharedDuringBuild: true,

    transform: {
      filter: { code: "<script", id: { exclude: NODE_MODULES_RE, include: SOURCE_RE } },
      async handler(code, id) {
        const isServer = this.environment.config.consumer === "server";
        const edits = await hoistScripts(this, code, id, isServer);
        if (edits.length > 0) return { code: applyEdits(code, edits), map: null };
        declared.delete(id);
        return null;
      },
    },
  } satisfies Plugin;

  const routeExports: Plugin = {
    applyToEnvironment: (environment) => environment.config.consumer === "server",
    enforce: "pre",
    name: `${WREN_NAME}-page-scripts-routes`,
    sharedDuringBuild: true,
    transform: {
      filter: { id: { exclude: NODE_MODULES_RE, include: routerFileFilter(router, SOURCE_RE) } },
      handler(code, id) {
        if (!id.startsWith(pagesDir) || !ROUTE_MODULE_RE.test(id)) return null;
        const { config, mode } = this.environment;
        return { code: code + stamp(id, config.root, mode === "build"), map: null };
      },
    },
  };

  return [plugin, routeExports];
};
