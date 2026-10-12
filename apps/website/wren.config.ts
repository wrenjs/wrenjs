import ssx from "@wrenjs/ssx";
import uno from "unocss/vite";
import { defineConfig } from "wrenjs/config";

export default defineConfig({
  build: { output: "static" },
  integrations: [ssx()],
  vite: {
    plugins: [uno()],
  },
});
