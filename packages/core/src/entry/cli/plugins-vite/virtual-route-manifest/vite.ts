import type { ConfigEnv, Plugin } from "vite";
import { resolve } from "node:path";
import { normalizePath } from "vite";
import type { WrenConfig } from "#/entry/config/types.js";
import { ROUTE_MODULE_RE, WREN_NAME } from "#/constants.ts";
import { ROUTES_MODULE } from "#shared/constants.ts";
import type { RouteClassificationCache } from "./generate/get-routes.ts";
import { generateRouteManifest } from "./generate/index.ts";
import { generateRouteManifestModule } from "./generate/module.ts";

const RESOLVED_ID = `\0${ROUTES_MODULE}`;

export const pluginRouteManifest = (env: ConfigEnv, config: WrenConfig): Plugin => {
  const classified: RouteClassificationCache = new Map();
  const served = new Map<string, string | undefined>();
  let generated: Promise<string> | undefined;

  const generate = (root: string) => {
    if (generated) return generated;
    const pending = generateRouteManifest(config, root, classified).then((manifest) =>
      generateRouteManifestModule(manifest, env.command === "build"),
    );
    generated = pending;
    pending.catch(() => {
      if (generated === pending) generated = undefined;
    });
    return pending;
  };

  // A file change while generating outdates the result, so wait for the next generation instead.
  const latest = async (root: string): Promise<string> => {
    const pending = generate(root);
    const code = await pending;
    return pending === generated ? code : latest(root);
  };

  return {
    configureServer(server) {
      const { root } = server.config;
      const base = `${normalizePath(resolve(root, config.router!))}/`;
      const refresh = async () => {
        generated = undefined;
        if (served.size === 0) return;
        const code = await latest(root).catch(() => undefined);
        let hit = false;
        for (const [name, previous] of served) {
          if (previous === code) continue;
          served.set(name, code);
          const { moduleGraph } = server.environments[name];
          const target = moduleGraph.getModuleById(RESOLVED_ID);
          if (!target) continue;
          hit = true;
          moduleGraph.invalidateModule(target);
        }
        if (hit) server.ws.send({ type: "full-reload" });
      };
      const onFile = (path: string) => {
        const file = normalizePath(path);
        if (!file.startsWith(base) || !ROUTE_MODULE_RE.test(file)) return;
        classified.delete(file);
        void refresh();
      };
      const onDirectory = (path: string) => {
        const directory = `${normalizePath(path)}/`;
        if (!directory.startsWith(base)) return;
        for (const file of classified.keys()) {
          if (file.startsWith(directory)) classified.delete(file);
        }
        void refresh();
      };
      server.watcher
        .on("add", onFile)
        .on("change", onFile)
        .on("unlink", onFile)
        .on("addDir", onDirectory)
        .on("unlinkDir", onDirectory);
    },
    load: {
      filter: { id: new RegExp(`^${RESOLVED_ID}$`) },
      async handler() {
        const code = await latest(this.environment.config.root);
        served.set(this.environment.name, code);
        return code;
      },
    },
    name: `${WREN_NAME}-route-manifest`,
    resolveId: {
      filter: { id: new RegExp(`^${ROUTES_MODULE}$`) },
      handler: () => RESOLVED_ID,
    },
  };
};
