import type { Plugin } from "vite";
import { PACKAGE_NAME } from "#/constants.ts";

const RSC_PLUGIN = "@vitejs/plugin-rsc";

export const pluginWrenBridgeRSC = (): Plugin => ({
  configEnvironment(_name, { optimizeDeps: { include } = {} }) {
    if (!include) return;
    for (let i = 0; i < include.length; i++) {
      if (include[i].startsWith(RSC_PLUGIN)) include[i] = `${PACKAGE_NAME} > ${include[i]}`;
    }
  },
  name: `${PACKAGE_NAME}:bridge-rsc`,
});
