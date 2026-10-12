import type { Plugin } from "vite";

export const pluginWrenPreactJsx = (): Plugin => {
  return {
    config() {
      return {
        build: {
          rolldownOptions: {
            onwarn(warning, warn) {
              // Silence Rollup's module-level directive warnings re:"use client".
              // They're likely to come from `node_modules` and won't be actionable.
              if (
                warning.code === "MODULE_LEVEL_DIRECTIVE" &&
                warning.message.includes("use client")
              ) {
                return;
              }
              // ESBuild seemingly doesn't include mappings for directives, causing
              // Rollup to emit warnings about missing source locations. This too is
              // Likely to come from `node_modules` and won't be actionable.
              // Evanw/esbuild#3548
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
