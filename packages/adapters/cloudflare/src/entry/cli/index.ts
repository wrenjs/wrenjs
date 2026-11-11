import type { PluginConfig, WorkerConfig } from "@cloudflare/vite-plugin";
import type { WrenAdapter } from "@wrenjs/core/config";
import type { Plugin } from "vite";

import { cloudflare } from "@cloudflare/vite-plugin";
import { appendFile, readFile } from "node:fs/promises";
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
const SERVER_ENTRY = "@wrenjs/adapter-cloudflare/entry/server";
const EDGE_CACHE = { "Cloudflare-CDN-Cache-Control": "max-age=31536000" };
const EDGE_CACHE_RE = /cloudflare-cdn-cache-control/i;
const CATCH_ALL_RE = /^[ \t]*\/\*[ \t]*$/m;

const workerDefaults = ({ assets, main, upload_source_maps }: WorkerConfig) => {
	const defaults: Partial<WorkerConfig> = {};
	if (!main) defaults.main = SERVER_ENTRY;
	// if (!compatibility_flags.includes("nodejs_compat")) {
	//   defaults.compatibility_flags = ["nodejs_compat"];
	// }
	if (!assets?.html_handling) defaults.assets = { html_handling: "drop-trailing-slash" };
	if (upload_source_maps === undefined) defaults.upload_source_maps = false;
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

const pluginHeaders = (headers: HeaderRules = {}, edgeCache = () => false): Plugin => ({
	buildApp: {
		async handler({ config: { logger }, environments: { client } }) {
			const { base, build, root } = client.config;
			const prefix = base.startsWith("/") ? base : "/";
			const file = resolve(root, build.outDir, "_headers");
			const rules: Record<string, Readonly<Record<string, string>>> = {
				[`${prefix}${build.assetsDir}/*`]: {
					[CACHE_CONTROL]: "public, max-age=31536000, immutable",
				},
				[`${prefix}*${FLIGHT_URL_POSTFIX}`]: HEADERS_FLIGHT,
				...headers,
			};
			if (edgeCache()) {
				const existing = await readFile(file, "utf8").catch(() => "");
				if (!EDGE_CACHE_RE.test(existing + JSON.stringify(headers))) {
					if ("/*" in rules || !CATCH_ALL_RE.test(existing)) {
						rules["/*"] = { ...rules["/*"], ...EDGE_CACHE };
					} else {
						logger.warn(
							`[wrenjs] Static files won't be edge-cached: _headers already has a "/*" rule, and adding another would replace it. Add this to that rule instead:\n${formatRule(["/*", EDGE_CACHE])}`,
						);
					}
				}
			}
			await appendFile(file, `\n${Object.entries(rules).map(formatRule).join("\n\n")}\n`);
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
		let edgeCache = false;
		return {
			environments: { [server.environment]: { optimizeDeps: { exclude: [SERVER_ENTRY] } } },
			plugins: [
				pluginWorker(server.entry, server.environment, childEnvironments),
				cloudflare({
					...plugin,
					config: (worker) => {
						const overrides = Object.assign(
							workerDefaults(worker),
							typeof customize === "function" ? customize(worker) : customize,
						);
						const { cache } = overrides;
						edgeCache =
							(cache?.enabled ?? worker.cache?.enabled) === true
							&& !(cache?.cross_version_cache ?? worker.cache?.cross_version_cache);
						return overrides;
					},
					viteEnvironment: { childEnvironments, name: server.environment },
				}),
				pluginHeaders(headers, () => edgeCache),
			],
		};
	},
});

export default wrenAdapterCloudflare;
