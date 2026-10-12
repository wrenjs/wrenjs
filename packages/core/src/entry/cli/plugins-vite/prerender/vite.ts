import type { ConfigEnv, Plugin } from "vite";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { WrenConfig } from "#/entry/config/types.js";
import type { PrerenderRuntime } from "#/types.js";
import { WREN_NAME } from "#/constants.ts";
import { prerenderRoutes } from "./index.ts";

export const pluginPrerenderRoutes = (_env: ConfigEnv, config: WrenConfig): Plugin => {
  const providers =
    config.integrations?.flatMap(({ prerender }) =>
      prerender ? [{ ...prerender, output: "", reference: "" }] : [],
    ) ?? [];

  return {
    apply: "build",
    buildApp: {
      async handler(builder) {
        if (!providers.length) return;
        const runtimes = await Promise.all(
          providers.map(async ({ environment, output }): Promise<PrerenderRuntime> => {
            if (!output) throw new Error(`No prerender entry was built for ${environment}.`);
            return import(/* @vite-ignore */ pathToFileURL(output).href);
          }),
        );
        const client = builder.environments.client;
        if (!client) throw new Error("Prerendering requires a client output environment.");
        const count = await prerenderRoutes(
          runtimes,
          resolve(builder.config.root, client.config.build.outDir),
          config.build?.prerender?.origin,
          config.build?.output === "static",
        );
        builder.config.logger.info(`Prerendered ${count} pages.`);
        // The prerender entry is a build-time tool only; keep it out of the deployable output.
        await Promise.all(
          providers.flatMap(({ output }) => [
            rm(output, { force: true }),
            rm(`${output}.map`, { force: true }),
          ]),
        );
      },
      order: "post",
    },
    buildStart() {
      for (const provider of providers) {
        if (provider.environment !== this.environment.name) continue;
        provider.reference = this.emitFile({
          id: provider.entry,
          preserveSignature: "strict",
          type: "chunk",
        });
      }
    },
    generateBundle() {
      // Frameworks may run analysis-only builds before their final builds.
      if (!this.environment.config.build.write) return;
      for (const provider of providers) {
        if (provider.environment !== this.environment.name) continue;
        provider.output = resolve(
          this.environment.config.root,
          this.environment.config.build.outDir,
          this.getFileName(provider.reference),
        );
      }
    },
    name: `${WREN_NAME}-prerender`,
    sharedDuringBuild: true,
  } satisfies Plugin;
};
