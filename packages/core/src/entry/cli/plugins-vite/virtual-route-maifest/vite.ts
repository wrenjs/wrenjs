import type { ConfigEnv, Plugin, ViteDevServer } from "vite";
import { resolve } from "node:path";
import { normalizePath } from "vite";
import type { WrenConfig } from "#/entry/config/types.js";
import { WREN_NAME } from "#/constants.ts";
import { generateRouteManifest } from "./generate/index.ts";
import { generateRouteManifestModule } from "./generate/module.ts";

const VIRTUAL_ID = `virtual:${WREN_NAME}-routes`;
const TARGET_IDS = [`\0${VIRTUAL_ID}`];

const reloadFileBased = (server: ViteDevServer, config: WrenConfig, path: string) => {
  let hit = false;

  // TODO: `config.router!` is declared as such because at this point in the program,
  // config.router is known to be either user provided or the default value.
  // This is declared as such in a few other places as well - check those.
  const base = normalizePath(resolve(server.config.root, config.router!));
  if (!normalizePath(path).startsWith(`${base}/`)) return;

  for (const viteEnv of Object.values(server.environments)) {
    for (const id of TARGET_IDS) {
      const target = viteEnv.moduleGraph.getModuleById(id);
      if (target) {
        hit = true;
        viteEnv.moduleGraph.invalidateModule(target);
      }
    }
  }
  if (hit) server.ws.send({ type: "full-reload" });
};

// oxlint-disable-next-line no-unused-vars -- TODO: Implement code-base routing.
const reloadCodeBased = (server: ViteDevServer, base: string, path: string) => {};

const generateManifest = async (config: WrenConfig, root: string, cacheModules: boolean = true) => {
  return generateRouteManifestModule(await generateRouteManifest(config, root), cacheModules);
};
export const pluginRouteManifest = (env: ConfigEnv, config: WrenConfig): Plugin => {
  const FILE_ROUTER_BASE = config.router!;
  const IS_FILE_ROUTER = typeof FILE_ROUTER_BASE === "string";
  const IS_BUILD = env.command === "build";

  return {
    async buildApp(builder) {
      // Discover routes even when no integration imports the virtual module.
      if (!config.integrations || config.integrations?.length === 0) {
        const manifest = await generateManifest(config, builder.config.root, IS_BUILD);
        console.debug("Generated route manifest:");
        console.debug(manifest);
      }
    },
    async configureServer(server) {
      const reloadFn = IS_FILE_ROUTER
        ? (path: string) => reloadFileBased(server, config, path)
        : (path: string) => reloadCodeBased(server, FILE_ROUTER_BASE, path);

      server.watcher.on("add", reloadFn);
      server.watcher.on("change", reloadFn);
      server.watcher.on("unlink", reloadFn);
    },

    async load(id) {
      if (TARGET_IDS.includes(id)) {
        return generateManifest(config, this.environment.config.root, IS_BUILD);
      }
      return null;
    },

    name: `${WREN_NAME}-route-manifest`,

    resolveId(source) {
      // TODO?: NOTE: When building consumer apps, seems to load manifest twice (this.environment.isBuilt vs not isBuilt seems potentially useful?)
      // At the moment appears harmless, but one side effect is the module IDs (see get-routes.ts) are incremented
      // twice (meaning the code is executed twice (???)). The resulting module IDs usually starts much greater than 0 (dependent on number of layouts, pages, etc.)
      // One happens usually around `[2/5] analyze server references...` and one happens at `[5/5] build ssr environment...`.

      // This could be intended vite behavior, tbh -- unsure. Need to investigate.
      // If intended, then id incrementation should be fixed.
      if (source === VIRTUAL_ID) {
        return `\0${source}`;
      }
      return null;
    },
  };
};
