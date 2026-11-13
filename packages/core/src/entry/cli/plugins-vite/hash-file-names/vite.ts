import type { Plugin, Rolldown } from "vite";

import { WREN_NAME } from "#/constants.ts";

const hashed = (
	output: Rolldown.OutputOptions | Rolldown.OutputOptions[] = {},
	isClient = true,
) => {
	if (Array.isArray(output)) {
		return undefined;
	}
	return {
		rolldownOptions: {
			output: {
				assetFileNames: output.assetFileNames ?? "[hash].[ext]",
				...(isClient && {
					chunkFileNames: output.chunkFileNames ?? "[hash].js",
					entryFileNames: output.entryFileNames ?? "[hash].js",
				}),
			},
		},
	};
};

/**
 * By default, removes original filenames from client chunks.
 * Likely doesn't matter, but is unsightly to appear in network requests on client browsers.
 */
export const pluginHashFileNames = (): Plugin => ({
	apply: "build",
	config: ({ worker }) => ({
		worker: hashed(worker?.rolldownOptions?.output),
	}),
	configEnvironment: (name, { build, consumer }) => ({
		build: hashed(build?.rolldownOptions?.output, (consumer ?? name) === "client"),
	}),
	name: `${WREN_NAME}-hash-file-names`,
});
