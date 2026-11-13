import type { RouteModule } from "@wrenjs/core/runtime/router";
import type { RouteApiHandler, RouteApiParams, RouteLoader, WrenContext } from "@wrenjs/core/types";
import type { RequestInput } from "virtual:wrenjs-fetch";

import { ENTRY_API_EXPORTS } from "@wrenjs/core/constants";
import scriptManifest from "virtual:wrenjs-page-scripts";

import { EXPORT_CSS, EXPORT_SCRIPTS } from "../../constants.ts";
import { eagerIslandSources } from "./islands.ts";
import { catchResponse, methodNotAllowed } from "./response.ts";

export const getRequest = (request: RequestInput): Request =>
	"toRequest" in request ? request.toRequest() : request;

interface RouteValues {
	children?: unknown;
	data?: unknown;
	params?: unknown;
}

class RouteProps {
	declare readonly children?: unknown;
	declare readonly context: WrenContext;
	declare readonly data?: unknown;
	declare readonly params?: unknown;

	get request(): Request {
		return getRequest(this.#input);
	}

	readonly #input: RequestInput;

	// Assigned one by one: copying an arbitrary object here was a measurable share of a request.
	constructor(input: RequestInput, context: WrenContext, { children, data, params }: RouteValues) {
		if (children !== undefined) {
			this.children = children;
		}
		if (data !== undefined) {
			this.data = data;
		}
		if (params !== undefined) {
			this.params = params;
		}
		this.context = context;
		this.#input = input;
	}
}

export const withRequest = <T extends RouteValues>(
	request: RequestInput,
	context: WrenContext,
	props: T,
): T & { readonly context: WrenContext; readonly request: Request } =>
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- RouteProps copies every value.
	new RouteProps(request, context, props) as unknown as T & {
		readonly context: WrenContext;
		readonly request: Request;
	};

const hasLoader = ({ loader }: { loader?: RouteLoader }) => loader !== undefined;

// Without loaders a route's data is one undefined per module, so requests share a frozen result.
const NO_DATA: Promise<readonly undefined[]>[] = [];
const noData = (count: number) => {
	NO_DATA[count] ??= Promise.resolve(Object.freeze(Array.from({ length: count }, () => undefined)));
	return NO_DATA[count];
};

export const loadRouteData = (
	request: RequestInput,
	context: WrenContext,
	params: Record<string, string>,
	modules: readonly { loader?: RouteLoader }[],
): Promise<readonly unknown[]> =>
	modules.some(hasLoader)
		? Promise.all(
				modules.map(async ({ loader }) => loader?.(withRequest(request, context, { params }))),
			)
		: noData(modules.length);

type UrlExport<K extends string> = Partial<Record<K, () => Promise<string[]> | string[]>>;

const dedupe = (lists: string[][]): string[] => [...new Set(lists.flat())];

const collectUrls = <K extends string>(
	modules: UrlExport<K>[],
	key: K,
): Promise<string[]> | string[] => {
	const lists = modules.map((module) => module[key]?.() ?? []);
	return lists.every((list) => Array.isArray(list))
		? dedupe(lists)
		: Promise.all(lists.map(async (list) => list)).then(dedupe);
};

const joinTags = (urls: Iterable<string>, tag: (url: string) => string): string => {
	let markup = "";
	for (const url of urls) {
		markup += tag(url);
	}
	return markup;
};

const stylesheetTag = (href: string) => `<link rel="stylesheet" href="${href}">`;
const modulePreloadTag = (href: string) => `<link rel="modulepreload" href="${href}">`;
const pageScriptTag = (src: string) => `<script type="module" src="${src}"></script>`;

export const collectModulePreloads = (scripts: readonly string[]): string[] => {
	const { imports } = scriptManifest;
	if (!imports) {
		return [];
	}
	const preloads = new Set(scripts.flatMap((script) => imports[script] ?? []));
	for (const script of scripts) {
		preloads.delete(script);
	}
	return [...preloads];
};
export const renderIslandPreloads = (
	html: string,
	requested: ReadonlySet<string>,
	islandScript: string | undefined,
): string => {
	const { imports } = scriptManifest;
	// Islands hoist their runtime into the route's scripts, so a route without it renders none.
	if (!imports || islandScript === undefined || !requested.has(islandScript)) {
		return "";
	}
	const preloads = new Set<string>();
	for (const src of eagerIslandSources(html)) {
		const deps = imports[src];
		if (!deps) {
			continue;
		}
		for (const url of [src, ...deps]) {
			if (!requested.has(url)) {
				preloads.add(url);
			}
		}
	}
	return joinTags(preloads, modulePreloadTag);
};

export const collectPageScripts = (
	modules: UrlExport<typeof EXPORT_SCRIPTS>[],
): Promise<string[]> | string[] => collectUrls(modules, EXPORT_SCRIPTS);

export const renderPageScripts = (
	modules: UrlExport<typeof EXPORT_SCRIPTS>[],
): Promise<string> | string => {
	const scripts = collectPageScripts(modules);
	return Array.isArray(scripts)
		? joinTags(scripts, pageScriptTag)
		: scripts.then((urls) => joinTags(urls, pageScriptTag));
};

export interface AssetTags {
	requested: ReadonlySet<string>;
	tags: string;
}

const assetTags = (stylesheets: string[], scripts: string[]): AssetTags => {
	const preloads = collectModulePreloads(scripts);
	return {
		requested: new Set([...scripts, ...preloads]),
		tags:
			joinTags(stylesheets, stylesheetTag)
			+ joinTags(preloads, modulePreloadTag)
			+ joinTags(scripts, pageScriptTag),
	};
};

export const renderAssetTags = (
	modules: (UrlExport<typeof EXPORT_CSS> & UrlExport<typeof EXPORT_SCRIPTS>)[],
): AssetTags | Promise<AssetTags> => {
	const stylesheets = collectUrls(modules, EXPORT_CSS);
	const scripts = collectPageScripts(modules);
	return Array.isArray(stylesheets) && Array.isArray(scripts)
		? assetTags(stylesheets, scripts)
		: Promise.all([stylesheets, scripts]).then(([links, urls]) => assetTags(links, urls));
};

const DOCTYPE = "<!DOCTYPE html>";
const DOCTYPE_RE = /^\s*<!doctype\s+html\s*>/i;
export const injectIntoHead = (html: string, markup: string): string => {
	if (import.meta.env.DEV) {
		markup = `<script type="module" src="${import.meta.env.BASE_URL}@vite/client"></script>${markup}`;
	}
	// Rendered documents open with a tag, which rules a doctype out without running the regex.
	const doctype = html.startsWith("<") && html[1] !== "!" ? undefined : DOCTYPE_RE.exec(html)?.[0];
	const documentHtml = doctype ? html : `${DOCTYPE}${html}`;
	if (!markup) {
		return documentHtml;
	}
	const headIndex = documentHtml.indexOf("</head>");
	const index = headIndex === -1 ? (doctype?.length ?? DOCTYPE.length) : headIndex;
	return documentHtml.slice(0, index) + markup + documentHtml.slice(index);
};

export const isTrustedOrigin = (request: RequestInput): boolean => {
	const origin = request.headers.get("origin");
	if (!origin) {
		return true;
	}
	const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
	return URL.parse(origin)?.host === host;
};

type ApiMethod = (typeof ENTRY_API_EXPORTS)[number];
const API_METHODS: ReadonlySet<string> = new Set(ENTRY_API_EXPORTS);
const isApiMethod = (method: string): method is ApiMethod => API_METHODS.has(method);

type ApiRouteStack = RouteApiParams & {
	module: RouteModule<unknown, RouteApiHandler>;
};

export const handlerApi = async (
	request: RequestInput,
	routeStack: ApiRouteStack,
): Promise<Response> => {
	const { module } = routeStack;
	const method = request.method.toUpperCase();
	const handler = isApiMethod(method) ? module[method] : undefined;
	if (!handler) {
		return methodNotAllowed(ENTRY_API_EXPORTS.filter((name) => module[name]));
	}
	try {
		return await handler(getRequest(request), routeStack);
	} catch (error) {
		return catchResponse(error);
	}
};
