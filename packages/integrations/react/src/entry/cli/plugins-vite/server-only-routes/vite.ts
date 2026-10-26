import type { RscPluginManager } from "@vitejs/plugin-rsc";
import type { Plugin } from "vite";
import { getPluginApi } from "@vitejs/plugin-rsc";
import { PACKAGE_NAME } from "#/constants.ts";
import { NODE_MODULES_RE } from "#shared/cli/utils.ts";
import { EXPORT_REQUIRES_CLIENT, ROUTE_MODULE_RE, ROUTES_MODULE } from "#shared/constants.ts";

const ROUTES_ID = `\0${ROUTES_MODULE}`;
const STAMP = `\nexport const ${EXPORT_REQUIRES_CLIENT} = false;\n`;

export const pluginWrenServerOnlyRoutes = (): Plugin => {
  let manager: RscPluginManager | undefined;
  const serverOnly = new Set<string>();

  return {
    apply: "build",
    applyToEnvironment: (env) => env.name === "rsc",
    buildEnd() {
      if (!manager?.isScanBuild) return;
      const queue = [
        ...Object.keys(manager.clientReferenceMetaMap),
        ...manager.serverReferences.metaMap.keys(),
      ];
      const tainted = new Set(queue);

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
      filter: { id: { exclude: NODE_MODULES_RE, include: ROUTE_MODULE_RE } },
      handler(code, id) {
        if (!serverOnly.has(id)) return undefined;
        return { code: code + STAMP, map: null };
      },
      order: "post",
    },
  };
};
