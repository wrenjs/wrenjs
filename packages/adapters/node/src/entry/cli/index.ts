import type { WrenAdapter } from "wrenjs/config";
import { copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface WrenAdapterNodeOptions {}
const wrenAdapterNode = (_options: WrenAdapterNodeOptions = {}): WrenAdapter => {
  const adapterDist = dirname(import.meta.filename);
  return {
    name: "wrenjs-adapter-node",

    viteConfig(_config, _env) {
      let root: string;
      let runtime: string;
      return {
        appType: "custom",
        plugins: [
          {
            apply: "build",
            configResolved(resolved) {
              root = resolved.root;
              runtime = "server.mjs";
            },
            name: "wrenjs-copy-runtime",
            async writeBundle() {
              await copyFile(join(adapterDist, "entry", runtime), join(root, "dist", runtime));
            },
          },
        ],
      };
    },
  };
};

export default wrenAdapterNode;
