import type { RscPluginManager } from "@vitejs/plugin-rsc";
import type { Plugin } from "vite";
import { getPluginApi } from "@vitejs/plugin-rsc";
import { EXPORT_REQUIRES_CLIENT } from "#shared/constants.ts";
import { PACKAGE_NAME } from "#/constants.ts";

const ROUTES_ID = "\0virtual:wrenjs-routes";
const STAMP = `\nexport const ${EXPORT_REQUIRES_CLIENT} = false;\n`;

/**
 * Marks route modules whose RSC import graph reaches no client or server reference,
 * letting the SSR renderer omit the browser bundle and Flight payload for them.
 * Server references count because Wren only invokes actions through the client runtime.
 */
export const pluginWrenServerOnlyRoutes = (): Plugin => {
  let manager: RscPluginManager | undefined;
  const serverOnly = new Set<string>();

  return {
    apply: "build",
    applyToEnvironment: (env) => env.name === "rsc",
    buildEnd() {
      // plugin-rsc's scan pass runs first and rewrites every import as static.
      if (!manager?.isScanBuild) return;
      const queue = [
        ...Object.keys(manager.clientReferenceMetaMap),
        ...manager.serverReferences.metaMap.keys(),
      ];
      const tainted = new Set(queue);
      // Pushing during for-of extends the walk to the full importer closure.
      for (const id of queue) {
        const info = this.getModuleInfo(id);
        if (!info) continue;
        for (const importer of [...info.importers, ...info.dynamicImporters]) {
          if (tainted.has(importer)) continue;
          tainted.add(importer);
          queue.push(importer);
        }
      }
      const routes = this.getModuleInfo(ROUTES_ID);
      if (!routes) return;
      for (const id of [...routes.importedIds, ...routes.dynamicallyImportedIds]) {
        if (!tainted.has(id)) serverOnly.add(id);
      }
    },
    configResolved(config) {
      manager = getPluginApi(config)?.manager;
    },
    name: `${PACKAGE_NAME}:server-only-routes`,
    transform: {
      handler(code, id) {
        if (!serverOnly.has(id)) return undefined;
        return { code: code + STAMP, map: null };
      },
      order: "post",
    },
  };
};
