import type { Plugin } from "vite";

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
          include: ["preact", "preact/jsx-runtime", "preact/jsx-dev-runtime"],
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
    enforce: "pre",
    name: "vite:preact-jsx",
  } satisfies Plugin;
};
