import type { PluginConfig, WorkerConfig } from "@cloudflare/vite-plugin";
import type { WrenAdapter } from "@wren-js/core/config";
import type { Plugin } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { appendFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { CACHE_CONTROL, FLIGHT_URL_POSTFIX, HEADERS_FLIGHT } from "#shared/constants.ts";

export interface CloudflareContext {
  ctx: ExecutionContext;
  env: Cloudflare.Env;
}

export type HeaderRules = Readonly<Record<string, Readonly<Record<string, string>>>>;

export interface WrenAdapterCloudflareOptions {
  headers?: HeaderRules;
  plugin?: Omit<PluginConfig, "viteEnvironment">;
}

declare global {
  namespace Wren {
    interface Context {
      cloudflare: CloudflareContext;
    }
  }
}

const NAME = "wrenjs-adapter-cloudflare";

const workerDefaults = ({ assets, compatibility_flags, main }: WorkerConfig) => {
  const defaults: Partial<WorkerConfig> = {};
  if (!main) defaults.main = "@wren-js/adapter-cloudflare/entry/server";
  if (!compatibility_flags.includes("nodejs_compat")) {
    defaults.compatibility_flags = ["nodejs_compat"];
  }
  if (!assets?.html_handling) defaults.assets = { html_handling: "drop-trailing-slash" };
  return defaults;
};

const pluginWorker = (entry: string, name: string, childEnvironments: string[]): Plugin => ({
  config({ build, environments = {} }) {
    const outDir = environments[name]?.build?.outDir ?? join(build?.outDir ?? "dist", name);
    const children = Object.keys(environments).filter(
      (child) => child !== name && environments[child]?.consumer === "server",
    );
    childEnvironments.splice(0, childEnvironments.length, ...children);
    return {
      environments: Object.fromEntries(
        children.map((child) => [
          child,
          {
            build: { outDir: join(outDir, basename(environments[child]?.build?.outDir ?? child)) },
          },
        ]),
      ),
    };
  },
  enforce: "pre",
  name: `${NAME}:worker`,
  resolveId: { filter: { id: /^virtual:wrenjs-fetch$/ }, handler: () => entry },
});

const formatRule = ([pattern, headers]: [string, Readonly<Record<string, string>>]) =>
  [pattern, ...Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`)].join("\n");

const pluginHeaders = (headers?: HeaderRules): Plugin => ({
  buildApp: {
    async handler({ environments: { client } }) {
      const { base, build, root } = client.config;
      const prefix = base.startsWith("/") ? base : "/";
      const rules = Object.entries({
        [`${prefix}${build.assetsDir}/*`]: {
          [CACHE_CONTROL]: "public, max-age=31536000, immutable",
        },
        [`${prefix}*${FLIGHT_URL_POSTFIX}`]: HEADERS_FLIGHT,
        ...headers,
      });
      await appendFile(
        resolve(root, build.outDir, "_headers"),
        `\n${rules.map(formatRule).join("\n\n")}\n`,
      );
    },
    order: "post",
  },
  name: `${NAME}:headers`,
});

const wrenAdapterCloudflare = ({
  headers,
  plugin = {},
}: WrenAdapterCloudflareOptions = {}): WrenAdapter => ({
  name: NAME,
  viteConfig: (config) => {
    if (config.build?.output === "static") return { plugins: [pluginHeaders(headers)] };
    const server = config.integrations?.find((integration) => integration.server)?.server;
    if (!server) {
      throw new Error(`[wrenjs] ${NAME} requires an integration that provides a server entry.`);
    }
    const customize = plugin.config;
    const childEnvironments: string[] = [];
    return {
      plugins: [
        pluginWorker(server.entry, server.environment, childEnvironments),
        cloudflare({
          ...plugin,
          config: (worker) =>
            Object.assign(
              workerDefaults(worker),
              typeof customize === "function" ? customize(worker) : customize,
            ),
          viteEnvironment: { childEnvironments, name: server.environment },
        }),
        pluginHeaders(headers),
      ],
    };
  },
});

export default wrenAdapterCloudflare;
