import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { loadEnv } from "vite";
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
import { getViteConfig } from "./vite.ts";

// Matches vite's API.
const PUBLIC_EXPORTS = "VITE_";
const loadConfig = async (env: ConfigEnv) => {
  const root = process.cwd();
  Object.assign(process.env, loadEnv(env.mode, root, ["", PUBLIC_EXPORTS]));
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
    ? (mergeConfig(DEFAULTS, loadedConfig.config) as WrenConfig)
    : DEFAULTS;
  const viteConfig = mergeConfig(await getViteConfig(env, config), config.vite ?? {});

  return {
    ...viteConfig,
    clearScreen: false,
    configFile: false,
    envDir: root,
    envPrefix: PUBLIC_EXPORTS,

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

          server.watcher.on("change", (file) => {
            const filename = basename(file);
            if (
              /\.config\.[^/]*$/.test(normalizePath(file)) ||
              (filename.startsWith(".env") && !filename.startsWith(".env.example"))
            ) {
              void server.restart().catch((error) => {
                server.config.logger.error(
                  error instanceof Error ? (error.stack ?? error.message) : String(error),
                );
              });
            }
          });
        },
        name: `${WREN_NAME}-config-reload`,
      },
    ],
  } satisfies InlineConfig;
};

const run = async (env: ConfigEnv) => {
  const config = await loadConfig(env);
  if (env.command === "build") return (await createBuilder(config)).buildApp();

  const server = await createServer(config);
  await server.listen();
  console.info(`${WREN_NAME} v${WREN_VERSION}`);
  server.printUrls();
  server.bindCLIShortcuts({ print: true });
  return server;
};

const { positionals, values } = parseArgs({
  allowPositionals: true,
  args: process.argv.slice(2),
  options: {
    help: { short: "h", type: "boolean" },
    version: { short: "v", type: "boolean" },
  },
});

if (values.version) {
  console.info(`${WREN_NAME} v${WREN_VERSION}`);
} else if (values.help) {
  console.info("Usage: wren [dev|build] [-h|--help] [-v|--version]");
} else {
  const command = positionals[0] === "build" ? "build" : "serve";
  run({
    command,
    mode: command === "build" ? "production" : (process.env.NODE_ENV ?? "development"),
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
