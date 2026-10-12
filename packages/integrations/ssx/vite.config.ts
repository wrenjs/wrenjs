import { defineConfig } from "vite-plus";
import { EXTERNAL_VIRTUAL_MODULES } from "../../_shared/pack.ts";

export default defineConfig({
  fmt: {},
  lint: {
    categories: {
      correctness: "deny",
      perf: "warn",
      suspicious: "warn",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  pack: {
    copy: [{ from: "./src/tsconfig/*.json", to: "./dist/tsconfig" }],
    deps: { neverBundle: EXTERNAL_VIRTUAL_MODULES, resolveDepSubpath: true },
    dts: {
      generator: "tsgo",
      tsconfig: "../../tsconfig.build.ssx.json",
    },
    entry: {
      "entry/client": "./src/entry/client/index.tsx",
      "entry/prerender": "./src/entry/prerender/index.tsx",
      "entry/ssr": "./src/entry/ssr/index.tsx",
      index: "./src/entry/cli/index.ts",
    },
    exports: {
      customExports: (exports) => ({
        ...exports,
        "./tsconfig/*": "./dist/tsconfig/*.json",
        "./tsconfig/*.json": "./tsconfig/*",
      }),
    },
    minify: true,
  },
});
