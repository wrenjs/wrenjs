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
      neverBundle: [/^node:/, /^vite/],
      resolveDepSubpath: true,
    },
    dts: {
      generator: "tsgo",
    },
    entry: {
      "entry/server": "src/entry/cli/server/index.ts",
      index: "src/entry/cli/index.ts",
    },
    exports: true,
    minify: true,
    plugins: [
      {
        name: "virtual-wrenjs-fetch-loader",
        resolveId(id) {
          if (id === "virtual:wrenjs-fetch") {
            return { external: true, id: "./ssr/index.js" };
          }
          return undefined;
        },
      },
    ],
  },
});
