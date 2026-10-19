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
import { createEnvLoader } from "./env.ts";
import { getViteConfig } from "./vite.ts";

// Matches vite's API.
const PUBLIC_EXPORTS = "VITE_";
const loadServerEnv = createEnvLoader();
const loadConfig = async (env: ConfigEnv) => {
  const root = process.cwd();
  loadServerEnv(env.mode, root);
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
          const envFiles = new Set(
            [".env", ".env.local", `.env.${env.mode}`, `.env.${env.mode}.local`].map((file) =>
              normalizePath(resolve(root, file)),
            ),
          );
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

          server.watcher.on("all", (event, file) => {
            const path = normalizePath(file);
            const isEnvChange =
              server.config.server.hmr === false &&
              (event === "add" || event === "change" || event === "unlink") &&
              envFiles.has(path);
            if ((event === "change" && /\.config\.[^/]*$/.test(path)) || isEnvChange) {
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
