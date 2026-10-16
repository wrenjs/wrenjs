import node from "@wren-js/adapter-node";
import { defineConfig } from "@wren-js/core/config";
import react from "@wren-js/react";

export default defineConfig({ adapter: node(), integrations: [react()] });
