import fmt from "@slowpoketail/oxc/fmt";
import base from "@slowpoketail/oxc/lint";
import { defineConfig } from "vite-plus";

const ignorePatterns = ["node_modules", "dist", "**/benchmarks/**", "**/examples/**/*"];
export default defineConfig({
	fmt: {
		...fmt,
		ignorePatterns,
	},
	lint: {
		extends: [base],
		ignorePatterns,
	},

	run: {
		cache: true,
	},
	staged: {
		"*": "vp check --fix",
	},
});
