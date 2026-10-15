import node from "@wren-js/adapter-node";
import ssx from "@wren-js/ssx";
import { defineConfig } from "@wren-js/core/config";

export default defineConfig({
  adapter: node(),
  integrations: [ssx()],
});
