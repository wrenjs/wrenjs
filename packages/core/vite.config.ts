import { defineConfig } from "vite-plus";
import { EXTERNAL_VIRTUAL_MODULES } from "../_shared/pack.ts";

export default defineConfig({
  fmt: {},
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    plugins: ["eslint", "import", "jsdoc", "node", "promise", "typescript", "unicorn"],
  },
  pack: {
    copy: [
      { from: "./src/tsconfig/*.json", to: "./dist/tsconfig" },
      { from: "./src/*.d.ts", to: "./dist" },
    ],
    deps: { neverBundle: EXTERNAL_VIRTUAL_MODULES, resolveDepSubpath: true },
    dts: {
      generator: "tsgo",
      tsconfig: "../tsconfig.build.core.json",
    },
    entry: {
      cli: "./src/entry/cli/index.ts",
      "components/Link/wren-link": "./src/runtime/components/Link/index.script.ts",
      config: "./src/entry/config/index.ts",
      constants: "./src/constants.ts",
      link: "./src/runtime/components/Link/index.ts",
      "runtime/prerender": "./src/runtime/prerender/index.ts",
      "runtime/router": "./src/runtime/router/index.ts",
    },
    exports: {
      customExports: (exports) => ({
        ...exports,
        "./tsconfig/*": "./dist/tsconfig/*.json",
        "./tsconfig/*.json": "./tsconfig/*",
        "./types": { types: "./dist/types.d.ts" },
      }),
    },
    minify: true,
  },
});
