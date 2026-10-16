import node from "@wren-js/adapter-node";
import { defineConfig } from "@wren-js/core/config";
import ssx from "@wren-js/ssx";

export default defineConfig({ adapter: node(), integrations: [ssx()] });
