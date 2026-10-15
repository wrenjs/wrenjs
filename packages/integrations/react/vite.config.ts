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
    plugins: ["react", "react-perf"],
  },
  pack: definePackConfig({
    entry: {
      "entry/client": "./src/entry/client/index.tsx",
      "entry/prerender": "./src/entry/prerender/index.tsx",
      "entry/rsc": "./src/entry/rsc/index.tsx",
      "entry/ssr": "./src/entry/ssr/index.tsx",
      index: "./src/entry/cli/index.ts",
    },
    tsconfig: "../../tsconfig.build.react.json",
  }),
});
