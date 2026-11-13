import fmt from "@slowpoketail/oxc/fmt";
import base from "@slowpoketail/oxc/lint";
import { defineConfig } from "vite-plus";

const ignorePatterns = ["node_modules", "dist", "**/benchmarks/**", "**/examples/**/*"];
const unassignedImport = base.rules?.["import/no-unassigned-import"];
const sideEffectImports = Array.isArray(unassignedImport) ? (unassignedImport[1]?.allow ?? []) : [];
export default defineConfig({
	fmt: {
		...fmt,
		ignorePatterns,
	},
	lint: {
		extends: [base],
		ignorePatterns,
		rules: {
			// `?script` imports load a page script the way a stylesheet import loads its styles.
			"import/no-unassigned-import": ["error", { allow: [...sideEffectImports, "**/*[?]script"] }],
		},
	},

	run: {
		cache: true,
	},
	staged: {
		"*": "vp check --fix",
	},
});
