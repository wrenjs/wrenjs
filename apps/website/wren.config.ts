import mdx from "@mdx-js/rollup";
import { defineConfig } from "@wrenjs/core/config";
import preact from "@wrenjs/preact";
import uno from "unocss/vite";

import { remarkHeadings } from "./remark-headings";

export default defineConfig({
	build: { output: "static" },
	integrations: [preact()],
	vite: {
		plugins: [mdx({ jsxImportSource: "preact", remarkPlugins: [remarkHeadings] }), uno()],
	},
});
