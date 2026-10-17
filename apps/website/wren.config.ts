import mdx from "@mdx-js/rollup";
import { defineConfig } from "@wren-js/core/config";
import preact from "@wren-js/preact";
import uno from "unocss/vite";
import { remarkHeadings } from "./remark-headings";

export default defineConfig({
  build: { output: "static" },
  integrations: [preact()],
  vite: {
    plugins: [
      mdx({ jsxImportSource: "preact", remarkPlugins: [remarkHeadings] }),
      uno({
        mode: "dist-chunk",
      }),
      {
        apply: "build",
        load(id) {
          if (id === "\0uno-dist-chunk-entry") return "";
          return undefined;
        },
        name: "uno-dist-chunk-entry",
        resolveId(id) {
          if (id === "uno.css" || id === "virtual:uno.css") {
            return "\0uno-dist-chunk-entry";
          }
          return undefined;
        },
      },
    ],
  },
});
