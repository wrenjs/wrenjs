import type { WrenAdapter } from "@wren-js/core/config";
import { copyFile } from "node:fs/promises";
import { join } from "node:path";
import { STATIC_ASSETS_FILE } from "./constants.ts";
import { writeStaticAssets } from "./static-assets.ts";

const RUNTIME = "server.mjs";

const wrenAdapterNode = (): WrenAdapter => ({
  name: "wrenjs-adapter-node",
  viteConfig: () => ({
    plugins: [
      {
        apply: "build",
        buildApp: {
          async handler(builder) {
            const dist = join(builder.config.root, "dist");
            await Promise.all([
              copyFile(join(import.meta.dirname, "entry", RUNTIME), join(dist, RUNTIME)),
              writeStaticAssets(join(dist, "client"), join(dist, STATIC_ASSETS_FILE)),
            ]);
          },
          order: "post",
        },
        name: "wrenjs-copy-runtime",
      },
    ],
  }),
});

export default wrenAdapterNode;
