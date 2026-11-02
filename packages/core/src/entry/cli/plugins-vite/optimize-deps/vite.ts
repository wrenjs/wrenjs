import type { Plugin } from "vite";
import { normalizePath } from "vite";
import { WREN_NAME } from "#/constants.ts";
import { escapeGlob } from "#shared/cli/utils.ts";

export const pluginOptimizeDeps = (router: string): Plugin => ({
  configEnvironment: (_name, { consumer }) => ({
    optimizeDeps: {
      entries: consumer === "server" ? [`${escapeGlob(normalizePath(router))}/**`] : undefined,
      exclude: ["@wren-js/core"],
    },
  }),
  name: `${WREN_NAME}-optimize-deps`,
});
