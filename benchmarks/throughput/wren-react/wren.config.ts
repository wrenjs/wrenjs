import node from "@wren-js/adapter-node";
import react from "@wren-js/react";
import { defineConfig } from "@wren-js/core/config";

export default defineConfig({
  adapter: node(),
  integrations: [react()],
});
