import node from "@wren-js/adapter-node";
import { defineConfig } from "@wren-js/core/config";
import preact from "@wren-js/preact";

export default defineConfig({ adapter: node(), build: {}, integrations: [preact()] });
