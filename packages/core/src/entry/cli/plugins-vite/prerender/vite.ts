import type { Plugin } from "vite";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { WrenConfig } from "#/entry/config/types.js";
import type { PrerenderRuntime } from "#/types.js";
import { WREN_NAME } from "#/constants.ts";
import { prerenderRoutes } from "./index.ts";
import { collectStylesheets } from "./inline-css.ts";

export const pluginPrerenderRoutes = (config: WrenConfig): Plugin => {
  const providers =
    config.integrations?.flatMap(({ prerender }) =>
      prerender ? [{ ...prerender, output: "", reference: "" }] : [],
    ) ?? [];
  const inlineCSS = config.build?.inlineCSS;
  const limit = inlineCSS === true ? Infinity : inlineCSS || 0;
  const styles = new Map<string, string>();

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
          styles,
        );
        builder.config.logger.info(`Prerendered ${count} pages.`);

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
    writeBundle(_options, bundle) {
      if (!limit || this.environment.name !== "client") return;
      collectStylesheets(bundle, this.environment.config.base, limit, styles);
    },
  } satisfies Plugin;
};
