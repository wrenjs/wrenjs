import type { WrenConfig } from "./types.js";

export type { WrenAdapter, WrenConfig, WrenIntegration } from "./types.js";

export const CONFIG_VALID_EXTENSIONS = ["ts", "mts", "js", "mjs"] as const;

export function defineConfig(config: WrenConfig = {}) {
	return config;
}

export const DEFAULTS: WrenConfig = {
	build: {
		hashFileNames: true,
		output: "server",
	},
	router: "src/pages",
};
