import type { DevEnvironment, Plugin, Rolldown } from "vite";

import { writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { isCSSRequest, normalizePath } from "vite";

import { WREN_NAME } from "#/constants.ts";
import { NODE_MODULES_RE, routerFileFilter, sortedRecord, stem } from "#shared/cli/utils.ts";
import {
	EXPORT_SCRIPTS,
	PAGE_SCRIPT_QUERY,
	PAGE_SCRIPT_URL_PREFIX,
	ROUTE_MODULE_RE,
	SOURCE_RE,
} from "#shared/constants.ts";

const VIRTUAL_ID = `virtual:${WREN_NAME}-page-scripts`;
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const IMPORT_NAME = "__wrenPageScripts";
const ROUTE_PREFIX = `${VIRTUAL_ID}:route:`;
const RESOLVED_ROUTE_PREFIX = `\0${ROUTE_PREFIX}`;
// Marks a page script in the server module graph: routes collect the ones they reach.
const HOISTED_ID = `\0${VIRTUAL_ID}:script:`;
const MANIFEST_FILE = "__wren-page-scripts.mjs";
const SCRIPT_URL_ID = `\0${PAGE_SCRIPT_URL_PREFIX}`;

interface ScriptTarget {
	id: string;

	imports?: string[];

	key: string;
	name: string;

	reference?: string;

	url?: string;
}

const toKey = (root: string, id: string) => {
	const path = normalizePath(relative(root, id));
	return path.startsWith("../") || isAbsolute(path)
		? `@fs/${normalizePath(id).replace(/^\//, "")}`
		: path;
};

const staticImports = (bundle: Rolldown.OutputBundle, fileName: string) => {
	const files = new Set([fileName]);
	for (const file of files) {
		const chunk = bundle[file];
		if (chunk?.type === "chunk") {
			for (const next of chunk.imports) {
				files.add(next);
			}
		}
	}
	files.delete(fileName);
	return [...files].filter((file) => file in bundle);
};

/**
 * Bundles modules imported as `import "./file.ts?script"` for the client and loads them on every
 * route whose server modules reach the import. Allows for one off scripts, theme scripts, Web
 * Components, etc. without needing to bundle heavier framework javascript.
 */
export const pluginPageScripts = (router: string): Plugin[] => {
	const registry = new Map<string, ScriptTarget>();
	const consumers = new Set<string>();

	const routes = new Map<string, string>();

	const imports = new Map<string, string[]>();
	let pagesDir: string;

	let environments: DevEnvironment[] = [];

	const register = (root: string, id: string) => {
		if (!registry.has(id)) {
			registry.set(id, { id, key: toKey(root, id), name: stem(id) });
		}
	};

	const collect = (root: string, edges: (id: string) => Iterable<string>) => {
		const targets = new Set<ScriptTarget>();
		const visited = new Set<string>();
		const walk = (id: string) => {
			if (visited.has(id)) {
				return;
			}
			visited.add(id);
			const target = id.startsWith(HOISTED_ID) && registry.get(id.slice(HOISTED_ID.length));
			if (target) {
				targets.add(target);
			}
			for (const next of edges(id)) {
				walk(next);
			}
		};
		walk(root);
		return [...targets];
	};

	const stamp = (id: string, root: string, isBuild: boolean) => {
		if (!isBuild) {
			return `\nexport const ${EXPORT_SCRIPTS} = async () => (await import(${JSON.stringify(ROUTE_PREFIX + encodeURIComponent(id))})).default;\n`;
		}
		const key = toKey(root, id);
		routes.set(id, key);
		return `\nimport ${IMPORT_NAME} from ${JSON.stringify(VIRTUAL_ID)};export const ${EXPORT_SCRIPTS} = () => ${IMPORT_NAME}.routes[${JSON.stringify(key)}];\n`;
	};

	const loadRouteScripts = (context: Rolldown.PluginContext, route: string) => {
		const targets = collect(route, (id) =>
			environments.flatMap(({ moduleGraph }) => {
				const mod = moduleGraph.getModuleById(id);

				if (mod?.file && isAbsolute(mod.file)) {
					context.addWatchFile(mod.file);
				}
				return Array.from(mod?.importedModules ?? [], (next) => next.id).filter(
					(next): next is string => next !== null && !isCSSRequest(next),
				);
			}),
		);
		const { base } = context.environment.config;
		return `export default ${JSON.stringify(targets.map((target) => base + target.key))};`;
	};

	const plugin = {
		buildApp: {
			async handler(builder) {
				const targets = [...registry.values()];
				const missing = targets.filter((target) => !target.url).map((target) => target.key);
				if (missing.length > 0) {
					throw new Error(
						`[${WREN_NAME}] Page scripts were not bundled by the client environment (server environments must build first): ${missing.join(", ")}`,
					);
				}
				const preload = builder.environments.client?.config.build.modulePreload !== false;
				const manifest = {
					...(preload && {
						imports: sortedRecord(targets.map((target) => [target.url!, target.imports ?? []])),
					}),
					routes: sortedRecord(
						Array.from(routes, ([id, key]) => [
							key,
							collect(id, (module) => imports.get(module) ?? []).map((target) => target.url),
						]),
					),
					scripts: sortedRecord(targets.map((target) => [target.key, target.url])),
				};
				const source = `export default ${JSON.stringify(manifest)};\n`;
				await Promise.all(
					[...consumers].map(async (name) => {
						const { build, root } = builder.environments[name].config;
						await writeFile(resolve(root, build.outDir, MANIFEST_FILE), source);
					}),
				);
			},
			order: "post",
		},

		buildEnd() {
			if (this.environment.mode !== "build") {
				return;
			}
			for (const id of this.getModuleIds()) {
				const info = this.getModuleInfo(id);
				if (!info) {
					continue;
				}
				const edges = [...info.importedIds, ...info.dynamicallyImportedIds];
				imports.set(id, [...(imports.get(id) ?? []), ...edges]);
			}
		},

		async buildStart({ input }) {
			const { mode, name } = this.environment;
			if (mode !== "build" || name !== "client") {
				return;
			}
			const entries = Object.entries(Array.isArray(input) ? {} : input);
			const resolved = await Promise.all(entries.map(([, source]) => this.resolve(source)));
			const inputNames = new Map(entries.map(([inputName], i) => [resolved[i]?.id, inputName]));
			for (const target of registry.values()) {
				target.reference = this.emitFile({
					id: target.id,
					name: inputNames.get(target.id) ?? `scripts/${target.name}`,
					preserveSignature: "exports-only",
					type: "chunk",
				});
			}
		},

		configResolved(config) {
			pagesDir = `${normalizePath(resolve(config.root, router))}/`;
		},

		configureServer(server) {
			environments = Object.values(server.environments);
		},

		enforce: "pre",

		generateBundle(_, bundle) {
			if (this.environment.name !== "client") {
				return;
			}
			const { base } = this.environment.config;
			for (const target of registry.values()) {
				if (target.reference) {
					const fileName = this.getFileName(target.reference);
					target.url = base + fileName;
					target.imports = staticImports(bundle, fileName).map((file) => base + file);
				}
			}
		},

		load: {
			filter: {
				id: [
					new RegExp(`^${SCRIPT_URL_ID}`),
					new RegExp(`^${RESOLVED_ROUTE_PREFIX}`),
					new RegExp(`^${HOISTED_ID}`),
					new RegExp(`^${RESOLVED_ID}$`),
				],
			},
			handler(id) {
				const { config, mode } = this.environment;
				if (id.startsWith(HOISTED_ID)) {
					return "export {};";
				}
				if (id === RESOLVED_ID) {
					return "export default { routes: {}, scripts: {} };";
				}
				if (id.startsWith(SCRIPT_URL_ID)) {
					const key = toKey(config.root, id.slice(SCRIPT_URL_ID.length));
					return mode === "build"
						? `import ${IMPORT_NAME} from ${JSON.stringify(VIRTUAL_ID)};export default ${IMPORT_NAME}.scripts[${JSON.stringify(key)}];`
						: `export default ${JSON.stringify(config.base + key)};`;
				}
				return loadRouteScripts(this, decodeURIComponent(id.slice(RESOLVED_ROUTE_PREFIX.length)));
			},
		},

		name: `${WREN_NAME}-page-scripts`,

		renderChunk(code, chunk) {
			if (!code.includes(VIRTUAL_ID)) {
				return null;
			}

			if (this.environment.config.build.write) {
				consumers.add(this.environment.name);
			}
			const specifier = normalizePath(relative(dirname(chunk.fileName), MANIFEST_FILE));
			const target = specifier.startsWith(".") ? specifier : `./${specifier}`;
			return { code: code.replaceAll(VIRTUAL_ID, target), map: null };
		},

		resolveId: {
			filter: {
				id: [
					new RegExp(`\\${PAGE_SCRIPT_QUERY}$`),
					new RegExp(`^(?:${PAGE_SCRIPT_URL_PREFIX}|${VIRTUAL_ID})`),
				],
			},
			async handler(source, importer) {
				if (source.endsWith(PAGE_SCRIPT_QUERY)) {
					const { config } = this.environment;
					// Browsers get page scripts from the route's tags, never through the importer.
					if (config.consumer !== "server") {
						return HOISTED_ID;
					}
					const resolved = await this.resolve(source.slice(0, -PAGE_SCRIPT_QUERY.length), importer);
					const isScriptUrl = resolved?.id.startsWith(SCRIPT_URL_ID);
					if (
						!resolved
						|| resolved.external
						|| (!isScriptUrl && NODE_MODULES_RE.test(resolved.id))
					) {
						return this.error(`"${source}" must resolve to a project file (${importer}).`);
					}
					const file = isScriptUrl ? resolved.id.slice(SCRIPT_URL_ID.length) : resolved.id;
					register(config.root, file);
					return HOISTED_ID + file;
				}
				if (source.startsWith(PAGE_SCRIPT_URL_PREFIX)) {
					// Asking for a file's URL bundles it. Ids other plugins resolve to this module only
					// look the URL up, which stays undefined in builds until something bundles the file.
					register(this.environment.config.root, source.slice(PAGE_SCRIPT_URL_PREFIX.length));
					return `\0${source}`;
				}
				if (source.startsWith(ROUTE_PREFIX)) {
					return `\0${source}`;
				}

				if (source !== VIRTUAL_ID) {
					return null;
				}
				return this.environment.mode === "build" ? { external: true, id: source } : RESOLVED_ID;
			},
		},

		sharedDuringBuild: true,
	} satisfies Plugin;

	const routeExports: Plugin = {
		applyToEnvironment: (environment) => environment.config.consumer === "server",
		// After the framework's transforms: RSC replaces every export of a "use client" module with a
		// client reference, and this one has to stay callable on the server.
		enforce: "post",
		name: `${WREN_NAME}-page-scripts-routes`,
		sharedDuringBuild: true,
		transform: {
			filter: { id: { exclude: NODE_MODULES_RE, include: routerFileFilter(router, SOURCE_RE) } },
			handler(code, id) {
				if (!id.startsWith(pagesDir) || !ROUTE_MODULE_RE.test(id)) {
					return null;
				}
				const { config, mode } = this.environment;
				return { code: code + stamp(id, config.root, mode === "build"), map: null };
			},
		},
	};

	return [plugin, routeExports];
};
