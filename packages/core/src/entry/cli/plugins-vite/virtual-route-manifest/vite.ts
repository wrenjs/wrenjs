import type { ConfigEnv, Plugin } from "vite";
import { resolve } from "node:path";
import { normalizePath } from "vite";
import type { WrenConfig } from "#/entry/config/types.js";
import { WREN_NAME } from "#/constants.ts";
import { ROUTES_MODULE } from "#shared/constants.ts";
import { generateRouteManifest } from "./generate/index.ts";
import { generateRouteManifestModule } from "./generate/module.ts";

const RESOLVED_ID = `\0${ROUTES_MODULE}`;

export const pluginRouteManifest = (env: ConfigEnv, config: WrenConfig): Plugin => ({
  configureServer(server) {
    const base = `${normalizePath(resolve(server.config.root, config.router!))}/`;
    const reload = (path: string) => {
      if (!normalizePath(path).startsWith(base)) return;
      let hit = false;
      for (const { moduleGraph } of Object.values(server.environments)) {
        const target = moduleGraph.getModuleById(RESOLVED_ID);
        if (!target) continue;
        hit = true;
        moduleGraph.invalidateModule(target);
      }
      if (hit) server.ws.send({ type: "full-reload" });
    };
    server.watcher.on("add", reload).on("change", reload).on("unlink", reload);
  },
  load: {
    filter: { id: new RegExp(`^${RESOLVED_ID}$`) },
    async handler() {
      const manifest = await generateRouteManifest(config, this.environment.config.root);
      return generateRouteManifestModule(manifest, env.command === "build");
    },
  },
  name: `${WREN_NAME}-route-manifest`,
  resolveId: {
    filter: { id: new RegExp(`^${ROUTES_MODULE}$`) },
    handler: () => RESOLVED_ID,
  },
});
