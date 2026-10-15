import { defineConfig } from "vite-plus";
import { definePackConfig } from "../../_shared/pack.ts";

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
  pack: definePackConfig({
    entry: {
      "entry/client": "./src/entry/client/index.tsx",
      "entry/prerender": "./src/entry/prerender/index.tsx",
      "entry/ssr": "./src/entry/ssr/index.tsx",
      index: "./src/entry/cli/index.ts",
      "runtime/island": "./src/runtime/island.tsx",
    },
    tsconfig: "../../tsconfig.build.preact.json",
  }),
});
