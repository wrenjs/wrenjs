import type { DevEnvironment, Plugin, Rolldown } from "vite";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { normalizePath } from "vite";
import { applyEdits, countLines, replaceLines } from "#shared/cli/edits.ts";
import {
  EXPORT_SCRIPTS,
  PAGE_SCRIPT_HOIST_PREFIX,
  PAGE_SCRIPT_URL_PREFIX,
  ROUTE_MODULE_RE,
} from "#shared/constants.ts";
import { WREN_NAME } from "#/constants.ts";
import { extractPageScripts, type PageScript } from "./extract.ts";

const VIRTUAL_ID = `virtual:${WREN_NAME}-page-scripts`;
const IMPORT_NAME = "__wrenPageScripts";
/** Dev: `<VIRTUAL_ID>:route:<id>` resolves a route module's script URLs from the module graphs. */
const ROUTE_PREFIX = `${VIRTUAL_ID}:route:`;
const RESOLVED_ROUTE_PREFIX = `\0${ROUTE_PREFIX}`;
/** Every `PAGE_SCRIPT_HOIST_PREFIX` import resolves to this empty module once registered. */
const HOISTED_ID = `\0${PAGE_SCRIPT_HOIST_PREFIX}`;
/** Inline scripts become `<file>?wren-script=<index>.ts` proxy modules, like Vite's `?html-proxy`. */
const INLINE_RE = /\?wren-script=(\d+)\.ts$/;
/** Written next to each server bundle after the client build: `{ routes: url[][], scripts: url[] }`. */
const MANIFEST_FILE = "__wren-page-scripts.mjs";
const SCRIPT_URL_ID = `\0${PAGE_SCRIPT_URL_PREFIX}`;
const SOURCE_RE = /\.[cm]?[jt]sx?$/;

/** A page script's client module, keyed by root-relative path (`@fs/…` outside root). */
interface ScriptTarget {
  id: string;
  /** Position in the manifest's `scripts`, read by `virtual:wrenjs-script-url:` imports (runtimes, islands). */
  index: number;
  key: string;
  name: string;
  /** Emitted client chunk, once the client environment builds. */
  reference?: string;
  /** Public URL, once the client environment has generated its bundle. */
  url?: string;
}

const toKey = (root: string, id: string) => {
  const path = normalizePath(relative(root, id));
  return path.startsWith("../") || isAbsolute(path)
    ? `@fs/${normalizePath(id).replace(/^\//, "")}`
    : path;
};

const stem = (file: string) => basename(file, extname(file));

/** The client module a `<script>` refers to; `undefined` when it cannot be bundled. */
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
  // Positions are reported against the source file; keep its line numbers.
  return {
    code: "\n".repeat(countLines(code.slice(0, script.codeStart))) + script.code,
    map: null,
  };
};

/**
 * Bundles `<script type="module">` elements found in JSX rendered by server
 * environments ("page scripts") through the client environment, without
 * involving any framework runtime.
 *
 * The elements are removed from the JSX and hoisted: every route module
 * (page, layout) gets an `EXPORT_SCRIPTS` export resolving the URLs of the
 * scripts declared anywhere in its import graph, so a script renders once per
 * page however many components declare it. Dev walks the module graphs at
 * request time; build records each environment's graph and writes the lists
 * into a manifest next to every server bundle that reads one.
 */
export const pluginPageScripts = (router: string): Plugin => {
  const registry = new Map<string, ScriptTarget>();
  const consumers = new Set<string>();
  /** Page scripts declared by each module, by module id. */
  const declared = new Map<string, ScriptTarget[]>();
  /**
   * Scripts declared through `PAGE_SCRIPT_HOIST_PREFIX` imports, by importing module id, then
   * by environment: several environments transform the same id, and each only clears its own.
   */
  const hoisted = new Map<string, Map<string, Set<ScriptTarget>>>();
  /** Stamped route modules; the position indexes the manifest's `routes`. */
  const routes: string[] = [];
  /** Build: static and dynamic imports of every module, across environments. */
  const imports = new Map<string, string[]>();
  let pagesDir: string;
  /** Dev: client components are proxies in RSC environments; other graphs hold their imports. */
  let environments: DevEnvironment[] = [];

  /** Registers a script once; later references reuse its manifest index. */
  const register = (root: string, target: Pick<ScriptTarget, "id" | "name">) => {
    const key = toKey(root, target.id);
    const entry = registry.get(key) ?? { ...target, index: registry.size, key };
    registry.set(key, entry);
    return entry;
  };

  const routeIndex = (id: string) => {
    const index = routes.indexOf(id);
    return index === -1 ? routes.push(id) - 1 : index;
  };

  /** Page scripts declared by `root` or anything it transitively imports, in import order. */
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

  /** Removes a module's page scripts from its JSX; server environments also register them. */
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
    // The client only drops the elements the server hoisted, keeping hydration in sync.
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

  /** The `EXPORT_SCRIPTS` export appended to a route module; only dev must resolve lazily. */
  const stamp = (id: string, isBuild: boolean) => {
    const fn = isBuild
      ? `() => ${IMPORT_NAME}.routes[${routeIndex(id)}]`
      : `async () => (await import(${JSON.stringify(ROUTE_PREFIX + encodeURIComponent(id))})).default`;
    const imported = isBuild ? `import ${IMPORT_NAME} from ${JSON.stringify(VIRTUAL_ID)};` : "";
    return `\n${imported}export const ${EXPORT_SCRIPTS} = ${fn};\n`;
  };

  /** Dev: a route module's script URLs, from every environment's module graph. */
  const loadRouteScripts = (context: Rolldown.PluginContext, route: string) => {
    const targets = collect(route, (id) =>
      environments.flatMap(({ moduleGraph }) => {
        const mod = moduleGraph.getModuleById(id);
        // Recompute when the route or anything it transitively imports changes.
        if (mod?.file) context.addWatchFile(mod.file);
        return Array.from(mod?.importedModules ?? [], (next) => next.id).filter(
          (next) => next !== null,
        );
      }),
    );
    const { base } = context.environment.config;
    return `export default ${JSON.stringify(targets.map((target) => base + target.key))};`;
  };

  return {
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
          routes: routes.map((id) =>
            collect(id, (module) => imports.get(module) ?? []).map((target) => target.url),
          ),
          scripts: targets.map((target) => target.url),
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
        // Islands are imported by URL at runtime; Vite's app builds would otherwise drop their exports.
        target.reference = this.emitFile({
          id: target.id,
          // Namespaced: plugin-rsc looks up the client entry by `chunk.name === "index"`.
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
          const { index, key } = register(config.root, { id: file, name: stem(file) });
          return mode === "build"
            ? `import ${IMPORT_NAME} from ${JSON.stringify(VIRTUAL_ID)};export default ${IMPORT_NAME}.scripts[${index}];`
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
      // Analysis-only builds (`write: false`) never load the manifest.
      if (this.environment.config.build.write) consumers.add(this.environment.name);
      const specifier = normalizePath(relative(dirname(chunk.fileName), MANIFEST_FILE));
      const target = specifier.startsWith(".") ? specifier : `./${specifier}`;
      return { code: code.replaceAll(VIRTUAL_ID, target), map: null };
    },

    async resolveId(source, importer) {
      if (source.startsWith(PAGE_SCRIPT_HOIST_PREFIX)) {
        // Only server graphs render pages; the client just needs the import to vanish.
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
      // Resolved per chunk in `renderChunk`, once the output layout is known.
      return source === VIRTUAL_ID ? { external: true, id: source } : null;
    },

    sharedDuringBuild: true,

    transform: {
      filter: { id: SOURCE_RE },
      async handler(code, id) {
        const { config, mode } = this.environment;
        const isServer = config.consumer === "server";
        const isRoute = isServer && id.startsWith(pagesDir) && ROUTE_MODULE_RE.test(id);
        const edits = code.includes("<script") ? await hoistScripts(this, code, id, isServer) : [];
        // Scripts removed since the last transform (dev) must be forgotten; hoist imports
        // re-register when this module's imports are resolved next.
        if (edits.length === 0) declared.delete(id);
        hoisted.get(id)?.delete(this.environment.name);
        if (edits.length === 0 && !isRoute) return null;
        // The stamp is appended only, so original positions are unchanged.
        const appended = isRoute ? stamp(id, mode === "build") : "";
        return { code: applyEdits(code, edits) + appended, map: null };
      },
    },
  } satisfies Plugin;
};
