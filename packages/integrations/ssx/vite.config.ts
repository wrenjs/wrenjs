import { defineIntegrationConfig } from "../../_shared/pack.ts";

export default defineIntegrationConfig({
  entry: {
    "entry/client": "./src/entry/client/index.tsx",
    "entry/prerender": "./src/entry/prerender/index.tsx",
    "entry/ssr": "./src/entry/ssr/index.tsx",
    index: "./src/entry/cli/index.ts",
  },
  tsconfig: "../../tsconfig.build.ssx.json",
});
