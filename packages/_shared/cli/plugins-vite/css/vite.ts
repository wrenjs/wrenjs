import type { DevEnvironment, Plugin, Rolldown } from "vite";
import { isAbsolute, resolve } from "node:path";
import { isCSSRequest, normalizePath } from "vite";
import { EXPORT_CSS, ROUTE_MODULE_RE } from "../../../constants.ts";

const VIRTUAL_PREFIX = "virtual:wrenjs-css:";
const RESOLVED_PREFIX = `\0${VIRTUAL_PREFIX}`;
const PLACEHOLDER = "__WREN_CSS__";
const SPECIAL_CSS_QUERY_RE = /[?&](?:url|inline|raw)(?:&|=|$)/;

const collectCss = (environment: DevEnvironment, entryId: string, base: string) => {
  const files = new Set<string>();
  const hrefs = new Set<string>();
  const visited = new Set<string>();
  const walk = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const mod = environment.moduleGraph.getModuleById(id);
    if (mod?.file && isAbsolute(mod.file)) files.add(mod.file);
    for (const { id: next, url } of mod?.importedModules ?? []) {
      if (!next) continue;
      if (!isCSSRequest(next)) walk(next);
      else if (!SPECIAL_CSS_QUERY_RE.test(next)) {
        const href = url.startsWith("/") ? url : `/@id/${url.replace("\0", "__x00__")}`;
        hrefs.add(base + href.slice(1));
      }
    }
  };
  walk(entryId);
  return { files, hrefs };
};

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
      load: {
        filter: { id: new RegExp(`^${RESOLVED_PREFIX}`) },
        handler(id) {
          if (this.environment.mode !== "dev") return null;
          const importer = decodeURIComponent(id.slice(RESOLVED_PREFIX.length));
          const { files, hrefs } = collectCss(this.environment, importer, base);

          for (const file of files) this.addWatchFile(file);
          return `export default ${JSON.stringify([...hrefs])};`;
        },
      },
      name: "wrenjs-css",
      resolveId: {
        filter: { id: new RegExp(`^${VIRTUAL_PREFIX}`) },
        handler: (source) => `\0${source}`,
      },
      transform: {
        filter: { id: ROUTE_MODULE_RE },
        handler(code, id) {
          if (!id.startsWith(pagesDir)) return null;
          const virtualId = JSON.stringify(VIRTUAL_PREFIX + encodeURIComponent(id));

          const fn =
            this.environment.mode === "dev"
              ? `async () => (await import(${virtualId})).default`
              : `() => ${PLACEHOLDER}`;
          return { code: `${code}\nexport const ${EXPORT_CSS} = ${fn};`, map: null };
        },
      },
    },
    {
      applyToEnvironment: (environment) => environment.name === "client",
      generateBundle() {
        for (const { fileName, source } of serverAssets) {
          this.emitFile({ fileName, source, type: "asset" });
        }
      },
      name: "wrenjs-css-assets",
    },
  ];
};
