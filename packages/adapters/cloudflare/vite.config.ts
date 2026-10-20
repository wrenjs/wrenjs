import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {},
  lint: {
    categories: {
      correctness: "deny",
      suspicious: "warn",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    plugins: ["eslint", "import", "jsdoc", "node", "promise", "typescript", "unicorn"],
  },
  pack: {
    deps: {
      neverBundle: [/^node:/, /^vite/, /^virtual:wrenjs-/],
      resolveDepSubpath: true,
    },
    dts: {
      generator: "tsgo",
      tsconfig: "../../tsconfig.build.cloudflare.json",
    },
    entry: {
      "entry/server": "src/entry/server/index.ts",
      index: "src/entry/cli/index.ts",
    },
    exports: true,
    minify: true,
  },
});
