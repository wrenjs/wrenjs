import node from "@wrenjs/adapter-node";
import preact from "@wrenjs/preact";
import { defineConfig } from "@wrenjs/core/config";

export default defineConfig({
  adapter: node(),
  integrations: [preact()],
});
