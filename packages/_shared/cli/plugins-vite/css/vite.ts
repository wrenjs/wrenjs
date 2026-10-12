import type { DevEnvironment, Plugin, Rolldown } from "vite";
import { resolve } from "node:path";
import { isCSSRequest, normalizePath } from "vite";
import { EXPORT_CSS, ROUTE_MODULE_RE } from "#shared/constants.ts";
import { PACKAGE_NAME } from "#/constants.ts";

const VIRTUAL_PREFIX = `virtual:${PACKAGE_NAME}/css?id=`;
const RESOLVED_PREFIX = `\0${VIRTUAL_PREFIX}`;
// Free identifier that survives bundling and minification; filled per chunk in `generateBundle`.
const PLACEHOLDER = "__WREN_SSX_CSS__";
// `?url` / `?inline` / `?raw` stylesheets are consumed by app code, not injected.
const SPECIAL_CSS_QUERY_RE = /[?&](?:url|inline|raw)(?:&|=|$)/;

/** Dev: stylesheets reachable from `entryId` as dev-server URLs, plus the module files walked to find them. */
const collectCss = (environment: DevEnvironment, entryId: string, base: string) => {
  const files = new Set<string>();
  const hrefs = new Set<string>();
  const visited = new Set<string>();
  const walk = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const mod = environment.moduleGraph.getModuleById(id);
    if (mod?.file) files.add(mod.file);
    for (const { id: next, url } of mod?.importedModules ?? []) {
      if (!next) continue;
      if (!isCSSRequest(next)) walk(next);
      else if (!SPECIAL_CSS_QUERY_RE.test(next)) {
        // Encode virtual module IDs using Vite's browser-facing URL convention.
        const href = url.startsWith("/") ? url : `/@id/${url.replace("\0", "__x00__")}`;
        hrefs.add(base + href.slice(1));
      }
    }
  };
  walk(entryId);
  return { files, hrefs };
};

/** Build: stylesheets emitted for `chunk` and the chunks it statically imports, as URLs. */
const collectChunkCss = (
  bundle: Rolldown.OutputBundle,
  chunk: Rolldown.OutputChunk,
  base: string,
) => {
  const hrefs = new Set<string>();
  const visited = new Set<string>();
  const walk = (current: Rolldown.OutputChunk) => {
    if (visited.has(current.fileName)) return;
    visited.add(current.fileName);
    for (const file of current.viteMetadata?.importedCss ?? []) hrefs.add(base + file);
    for (const name of current.imports) {
      const imported = bundle[name];
      if (imported?.type === "chunk") walk(imported);
    }
  };
  walk(chunk);
  return [...hrefs];
};

/**
 * SSX renders plain strings with no client runtime, so stylesheets imported by
 * route modules must be linked from the server. Each route module gets a lazy
 * `EXPORT_CSS` export: in dev it resolves the module graph's CSS at render time;
 * in build it is a placeholder filled with the chunk's emitted CSS files.
 *
 * Server-emitted assets (CSS, fonts, images) are public, so the client build,
 * which core runs after the server builds, re-emits them into its outDir.
 */
export const pluginWrenCss = (router: string): Plugin[] => {
  let base: string;
  let pagesDir: string;
  const serverAssets: Rolldown.OutputAsset[] = [];
  return [
    {
      applyToEnvironment: (environment) => environment.name === "ssr",
      configResolved(config) {
        base = config.base;
        pagesDir = `${normalizePath(resolve(config.root, router))}/`;
      },
      generateBundle(_options, bundle) {
        for (const output of Object.values(bundle)) {
          if (output.type === "asset") {
            if (output.fileName.endsWith(".map")) continue;
            serverAssets.push(output);
            delete bundle[output.fileName];
          } else if (output.code.includes(PLACEHOLDER)) {
            const hrefs = JSON.stringify(collectChunkCss(bundle, output, base));
            output.code = output.code.replaceAll(PLACEHOLDER, hrefs);
          }
        }
      },
      load(id) {
        if (this.environment.mode !== "dev" || !id.startsWith(RESOLVED_PREFIX)) return null;
        const importer = decodeURIComponent(id.slice(RESOLVED_PREFIX.length));
        const { files, hrefs } = collectCss(this.environment, importer, base);
        // Recompute when the importer or anything it transitively imports changes.
        for (const file of files) this.addWatchFile(file);
        return `export default ${JSON.stringify([...hrefs])};`;
      },
      name: `${PACKAGE_NAME}:css`,
      resolveId(source) {
        return source.startsWith(VIRTUAL_PREFIX) ? `\0${source}` : null;
      },
      transform(code, id) {
        if (!id.startsWith(pagesDir) || !ROUTE_MODULE_RE.test(id)) return null;
        const virtualId = JSON.stringify(VIRTUAL_PREFIX + encodeURIComponent(id));
        // Only dev must resolve lazily; the build's list is static.
        const fn =
          this.environment.mode === "dev"
            ? `async () => (await import(${virtualId})).default`
            : `() => ${PLACEHOLDER}`;
        return {
          code: `${code}\nexport const ${EXPORT_CSS} = ${fn};`,
          // Appended only; original positions are unchanged.
          map: null,
        };
      },
    },
    {
      applyToEnvironment: (environment) => environment.name === "client",
      generateBundle() {
        for (const { fileName, source } of serverAssets) {
          this.emitFile({ fileName, source, type: "asset" });
        }
      },
      name: `${PACKAGE_NAME}:css-assets`,
    },
  ];
};
