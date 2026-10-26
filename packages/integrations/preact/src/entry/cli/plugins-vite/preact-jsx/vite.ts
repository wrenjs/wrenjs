import type { Plugin } from "vite";
import { PACKAGE_NAME } from "#/constants.ts";

const PREFRESH_DEPS: ReadonlySet<string> = new Set(["@prefresh/core", "@prefresh/utils"]);

export const pluginWrenPreactJsx = (): Plugin => {
  return {
    config() {
      return {
        build: {
          rolldownOptions: {
            onwarn(warning, warn) {
              if (
                warning.code === "MODULE_LEVEL_DIRECTIVE" &&
                warning.message.includes("use client")
              ) {
                return;
              }

              if (
                warning.code === "SOURCEMAP_ERROR" &&
                warning.message.includes("resolve original location") &&
                warning.pos === 0
              ) {
                return;
              }
              warn(warning);
            },
          },
        },
        optimizeDeps: {
          include: ["preact", "preact/hooks", "preact/jsx-runtime", "preact/jsx-dev-runtime"],
          rolldownOptions: {
            transform: {
              jsx: {
                runtime: "automatic",
              },
            },
          },
        },
        oxc: {
          jsx: {
            importSource: "preact",
            runtime: "automatic",
          },
        },
      };
    },
    configEnvironment(_name, { optimizeDeps: { include } = {} }) {
      if (!include) return;
      for (let i = 0; i < include.length; i++) {
        if (PREFRESH_DEPS.has(include[i])) {
          include[i] = `${PACKAGE_NAME} > @prefresh/vite > ${include[i]}`;
        }
      }
    },
    enforce: "pre",
    name: "vite:preact-jsx",
  } satisfies Plugin;
};
