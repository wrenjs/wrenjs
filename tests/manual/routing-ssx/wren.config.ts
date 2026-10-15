import node from "@wren-js/adapter-node";
import ssx from "@wren-js/ssx";
import { defineConfig } from "@wrenjs/core/config";

export default defineConfig({ adapter: node(), integrations: [ssx()] });
