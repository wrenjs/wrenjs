import { defineConfig } from "vite-plus";
import { definePackConfig } from "../_shared/pack.ts";

export default defineConfig({
  fmt: {},
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    plugins: ["eslint", "import", "jsdoc", "node", "promise", "typescript", "unicorn"],
  },
  pack: definePackConfig({
    copy: [{ from: "./src/*.d.ts", to: "./dist" }],
    entry: {
      cli: "./src/entry/cli/index.ts",
      "components/Link/wren-link": "./src/runtime/components/Link/index.script.ts",
      config: "./src/entry/config/index.ts",
      constants: "./src/constants.ts",
      link: "./src/runtime/components/Link/index.ts",
      "runtime/prerender": "./src/runtime/prerender/index.ts",
      "runtime/router": "./src/runtime/router/index.ts",
    },
    exports: { "./types": { types: "./dist/types.d.ts" } },
    tsconfig: "../tsconfig.build.core.json",
  }),
});
