import node from "@wren-js/adapter-node";
import { defineConfig } from "@wren-js/core";
import preact from "@wren-js/preact";

export default defineConfig({ adapter: node(), integrations: [preact()] });
