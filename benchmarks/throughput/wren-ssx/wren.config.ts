import node from "@wrenjs/adapter-node";
import ssx from "@wrenjs/ssx";
import { defineConfig } from "wrenjs/config";

export default defineConfig({
  adapter: node(),
  integrations: [ssx()],
});
