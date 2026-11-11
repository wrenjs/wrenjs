import node from "@wrenjs/adapter-node";
import { defineConfig } from "@wrenjs/core/config";
import preact from "@wrenjs/preact";

export default defineConfig({ adapter: node(), build: {}, integrations: [preact()] });
