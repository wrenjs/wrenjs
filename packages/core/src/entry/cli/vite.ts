import { type ConfigEnv, defineConfig, mergeConfig } from "vite";
import type { WrenConfig } from "#/entry/config/types.js";
import { WREN_NAME } from "#/constants.ts";
import { pluginPageScripts } from "./plugins-vite/page-scripts/vite.ts";
import { pluginPrerenderRoutes } from "./plugins-vite/prerender/vite.ts";
import { pluginRouteManifest } from "./plugins-vite/virtual-route-maifest/vite.ts";

export const getViteConfig = async (env: ConfigEnv, config: WrenConfig) => {
  const baseConfig = defineConfig({
    appType: "custom",
    build: {
      minify: true,
      outDir: "dist",
      rolldownOptions: {
        experimental: {
          nativeMagicString: true,
        },
        optimization: {
          inlineConst: {
            mode: "smart",
            pass: 2,
          },
        },
      },
    },
    builder: {
      async buildApp(builder) {
        // Server builds run first: they discover what the client must bundle (page scripts).
        const environments = Object.values(builder.environments).toSorted(
          (a, b) => Number(a.config.consumer === "client") - Number(b.config.consumer === "client"),
        );
        for (const environment of environments) {
          if (environment.isBuilt) continue;
          const { build, input: environmentInput, isBundled } = environment.config;
          const input =
            build.rolldownOptions.input ??
            (build.lib ? build.lib.entry : undefined) ??
            (typeof build.ssr === "string" ? build.ssr : environmentInput);
          const hasInput = typeof input === "string" || Object.keys(input ?? {}).length > 0;

          // Vite falls back to building every environment when none was built.
          if (!hasInput || !isBundled) {
            delete builder.environments[environment.name];
            continue;
          }
          // oxlint-disable-next-line no-await-in-loop -- Environments may depend on earlier build output.
          await builder.build(environment);
        }
      },
      sharedConfigBuild: true,
      sharedPlugins: true,
    },
    plugins: [
      { api: { wrenConfig: config }, name: `${WREN_NAME}-config` },
      pluginRouteManifest(env, config),
      // Writes the page-script manifest before prerendering imports the server bundles.
      pluginPageScripts(config.router!),
      pluginPrerenderRoutes(env, config),
    ],
    resolve: {
      tsconfigPaths: true,
    },
  });

  const viteConfigs = await Promise.all(
    [config.adapter, ...(config.integrations ?? [])].map(async (provider) =>
      provider?.viteConfig(config, env),
    ),
  );
  let merged = baseConfig;
  for (const viteConfig of viteConfigs) {
    if (!viteConfig) continue;
    merged = mergeConfig(merged, viteConfig);
  }

  return merged;
};
