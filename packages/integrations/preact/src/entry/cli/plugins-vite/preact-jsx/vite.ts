import type { Plugin } from "vite";
import { PACKAGE_NAME } from "#/constants.ts";

const PREFRESH_DEPS: ReadonlySet<string> = new Set(["@prefresh/core", "@prefresh/utils"]);

const PREACT_DEPS = ["preact", "preact/hooks", "preact/jsx-runtime", "preact/jsx-dev-runtime"];

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
          include: [...PREACT_DEPS],
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
    configEnvironment(_name, { consumer, optimizeDeps: { include } = {}, resolve }) {
      if (include) {
        for (let i = 0; i < include.length; i++) {
          if (PREFRESH_DEPS.has(include[i])) {
            include[i] = `${PACKAGE_NAME} > @prefresh/vite > ${include[i]}`;
          }
        }
      }
      if (consumer === "server" && resolve?.noExternal === true) {
        return { optimizeDeps: { include: [...PREACT_DEPS, `${PACKAGE_NAME}/runtime/island`] } };
      }
      return undefined;
    },
    enforce: "pre",
    name: "vite:preact-jsx",
  } satisfies Plugin;
};
