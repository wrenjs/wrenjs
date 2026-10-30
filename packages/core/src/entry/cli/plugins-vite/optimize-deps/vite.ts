import type { Plugin } from "vite";
import { normalizePath } from "vite";
import { WREN_NAME } from "#/constants.ts";
import { escapeGlob } from "#shared/cli/utils.ts";

export const pluginOptimizeDeps = (router: string): Plugin => ({
  configEnvironment(_name, { consumer, optimizeDeps }) {
    if (consumer !== "server" || optimizeDeps?.noDiscovery !== false) return undefined;
    return { optimizeDeps: { entries: [`${escapeGlob(normalizePath(router))}/**`] } };
  },
  name: `${WREN_NAME}-optimize-deps`,
});
