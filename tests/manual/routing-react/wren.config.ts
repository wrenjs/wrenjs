import node from "@wrenjs/adapter-node";
import react from "@wrenjs/react";
import { defineConfig } from "wrenjs/config";

export default defineConfig({ adapter: node(), integrations: [react()] });
