import node from "@wrenjs/adapter-node";
import { defineConfig } from "@wrenjs/core/config";
import react from "@wrenjs/react";

export default defineConfig({ adapter: node(), integrations: [react()] });
