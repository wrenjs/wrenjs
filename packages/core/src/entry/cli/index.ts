import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import {
  type ConfigEnv,
  createBuilder,
  createServer,
  type InlineConfig,
  loadConfigFromFile,
  mergeConfig,
  normalizePath,
} from "vite";
import type { WrenConfig } from "#/entry/config/types.js";
import { WREN_NAME, WREN_VERSION } from "#/constants.ts";
import { CONFIG_VALID_EXTENSIONS, DEFAULTS } from "#/entry/config/index.ts";
import { getWorkspaceRoot } from "#/utils/workspace.ts";
import { getViteConfig } from "./vite.ts";

const loadConfig = async (env: ConfigEnv) => {
  const root = getWorkspaceRoot();
  const configFiles = CONFIG_VALID_EXTENSIONS.map((ext) =>
    normalizePath(resolve(root, `wren.config.${ext}`)),
  );
  const configFile = configFiles.find((file) => existsSync(file));
  const loadedConfig = configFile ? await loadConfigFromFile(env, configFile) : null;
  const dependencies = new Set([
    ...configFiles,
    ...(loadedConfig?.dependencies ?? []).map((file) => normalizePath(resolve(file))),
  ]);
  const config = loadedConfig
    ? /* oxlint-disable-next-line typescript/no-unsafe-type-assertion
       TODO?: `loadConfigFromFile` is convenient to use here, but we know better
       that the resolved configuration is indeed of type `WrenConfig` */
      (mergeConfig(DEFAULTS, loadedConfig.config) as WrenConfig)
    : DEFAULTS;
  const viteConfig = mergeConfig(await getViteConfig(env, config), config.vite ?? {});
  return {
    ...viteConfig,
    configFile: false,
    mode: env.mode,
    plugins: [
      ...(viteConfig.plugins ?? []),
      {
        apply: "serve",
        configResolved(resolvedConfig) {
          resolvedConfig.configFileDependencies.push(...dependencies);
        },
        configureServer(server) {
          const restart = server.restart.bind(server);
          let restartPromise: Promise<void> | undefined;
          server.restart = (forceOptimize) => {
            restartPromise ??= (async () => {
              const nextConfig = await loadConfig(env);
              const { inlineConfig } = server.config;
              // Vite restarts from inlineConfig; replace it so removed options do not survive.
              for (const key of Object.keys(inlineConfig)) {
                Reflect.deleteProperty(inlineConfig, key);
              }
              Object.assign(inlineConfig, nextConfig);
              await restart(forceOptimize);
            })().finally(() => {
              restartPromise = undefined;
            });
            return restartPromise;
          };
        },
        name: `${WREN_NAME}-config-reload`,
      },
    ],
  } satisfies InlineConfig;
};

const run = async (env: ConfigEnv) => {
  env.mode = env.command === "build" ? "production" : (process.env.NODE_ENV ?? "development");
  const config = await loadConfig(env);

  if (env.command === "serve") {
    const server = await createServer(config);
    await server.listen();
    console.info(`${WREN_NAME} v${WREN_VERSION}`);
    server.printUrls();
    server.bindCLIShortcuts({ print: true });
    return server;
  }
  if (env.command === "build") {
    const builder = await createBuilder(config);
    return builder.buildApp();
  }

  return Promise.resolve();
};

const args = parseArgs({
  allowPositionals: true,
  args: process.argv,
  options: {
    help: { short: "h", type: "boolean" },
    version: { short: "v", type: "boolean" },
  },
});
const action = args.positionals[2];

run({
  command: action === "build" ? "build" : "serve",
  mode: process.env.NODE_ENV ?? "production",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
