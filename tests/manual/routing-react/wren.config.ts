import node from "@wren-js/adapter-node";
import react from "@wren-js/react";
import { defineConfig } from "@wrenjs/core/config";

export default defineConfig({ adapter: node(), integrations: [react()] });
