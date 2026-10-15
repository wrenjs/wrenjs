import node from "@wren-js/adapter-node";
import preact from "@wren-js/preact";
import { defineConfig } from "@wren-js/core/config";

export default defineConfig({
  adapter: node(),
  integrations: [preact()],
});
