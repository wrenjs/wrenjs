import node from "@wrenjs/adapter-node";
import { defineConfig } from "@wrenjs/core/config";
import ssx from "@wrenjs/ssx";

export default defineConfig({ adapter: node(), integrations: [ssx()] });
