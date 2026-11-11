import type { Plugin, Rolldown } from "vite";

import { posix } from "node:path";

import { WREN_NAME } from "#/constants.ts";

const hashed = (
	output: Rolldown.OutputOptions | Rolldown.OutputOptions[] = {},
	assetsDir = "assets",
	isClient = true,
) => {
	if (Array.isArray(output)) {
		return undefined;
	}
	const fileName = (pattern: string, name = "") =>
		posix.join(assetsDir, posix.dirname(name), pattern);
	const assetFileName = ({ names }: Rolldown.PreRenderedAsset) =>
		fileName("[hash].[ext]", names[0]);
	const jsFileName = ({ name }: Rolldown.PreRenderedChunk) => fileName("[hash].js", name);
	return {
		rolldownOptions: {
			output: {
				assetFileNames: output.assetFileNames ?? assetFileName,
				...(isClient && {
					chunkFileNames: output.chunkFileNames ?? jsFileName,
					entryFileNames: output.entryFileNames ?? jsFileName,
				}),
			},
		},
	};
};

export const pluginHashFileNames = (): Plugin => ({
	apply: "build",
	config: ({ build, worker }) => ({
		worker: hashed(worker?.rolldownOptions?.output, build?.assetsDir),
	}),
	configEnvironment: (name, { build, consumer }) => ({
		build: hashed(
			build?.rolldownOptions?.output,
			build?.assetsDir,
			(consumer ?? name) === "client",
		),
	}),
	name: `${WREN_NAME}-hash-file-names`,
});
