import type { RequestInput } from "virtual:wrenjs-fetch";

import { ENTRY_KIND_API, ENTRY_KIND_NOT_FOUND, ENTRY_KIND_PAGE } from "@wrenjs/core/constants";

import type { IntegrationRouteStack, LayoutProps, PageProps } from "../../types.ts";
import type { AssetTags } from "./helpers.ts";
import type { RequestToStackMap } from "./request-to-stack.ts";

import { CLIENT_REFERENCE, HEADERS_FLIGHT, HEADERS_HTML_RESPONSE } from "../../constants.ts";
import {
	handlerApi,
	injectIntoHead,
	loadRouteData,
	renderAssetTags,
	renderIslandPreloads,
	withRequest,
} from "./helpers.ts";
import { catchResponse, WrenResponse } from "./response.ts";

export interface CreateElement<TStack extends IntegrationRouteStack, TElement> {
	(type: TStack["module"]["default"], props: PageProps): TElement;
	(type: NonNullable<TStack["layouts"]>[number]["default"], props: LayoutProps<TElement>): TElement;
}

export type PageRenderer<TStack> = (request: RequestInput, routeStack: TStack) => Promise<string>;

export interface PreparedPage<TStack extends IntegrationRouteStack> {
	context: TStack["context"];
	data: ReturnType<typeof loadRouteData>;
	layouts: NonNullable<TStack["layouts"]>;
	module: TStack["module"];
	modules: TStack["modules"];
	params: TStack["params"];
}

const isClientReference = (component: unknown) =>
	typeof component === "function"
	&& "$$typeof" in component
	&& component.$$typeof === CLIENT_REFERENCE;

// Whatever a client component receives is sent to the browser, so a client route component gets
// its children or params only: never loader data, the request or the server context.
export const composeTree = <TStack extends IntegrationRouteStack, TElement>(
	request: RequestInput,
	{ context, data, layouts, module, params }: PreparedPage<TStack>,
	h: CreateElement<TStack, TElement>,
): TElement =>
	layouts.reduce(
		(children: TElement, { default: Layout }) =>
			h(
				Layout,
				isClientReference(Layout)
					? { children }
					: withRequest(request, context, { children, data }),
			),
		h(
			module.default,
			isClientReference(module.default)
				? { params }
				: withRequest(request, context, { data, params }),
		),
	);

export const pageStatus = ({ kind }: { kind: string }): number =>
	kind === ENTRY_KIND_NOT_FOUND ? 404 : 200;

type HeaderRecord = Readonly<Record<string, string>>;

const pageHeadersCache = new WeakMap<object, readonly [HeaderRecord, HeaderRecord]>();
const hasHeaders = ({ config }: IntegrationRouteStack["module"]) => config?.headers !== undefined;

// Header names are case-insensitive, so later records must override earlier ones in any case.
const mergeHeaders = (records: readonly (HeaderRecord | undefined)[]): HeaderRecord => {
	const merged: Record<string, string> = {};
	for (const record of records) {
		for (const [name, value] of Object.entries(record ?? {})) merged[name.toLowerCase()] = value;
	}
	return merged;
};

export const pageHeaders = (
	{ module, modules }: Pick<IntegrationRouteStack, "module" | "modules">,
	isFlight: boolean,
): HeaderRecord => {
	if (!modules.some(hasHeaders)) {
		return isFlight ? HEADERS_FLIGHT : HEADERS_HTML_RESPONSE;
	}
	let headers = import.meta.env.DEV ? undefined : pageHeadersCache.get(module);
	if (!headers) {
		// Outermost layout first, so that nearer modules override it.
		const custom = modules.toReversed().map(({ config }) => config?.headers);
		headers = [
			mergeHeaders([HEADERS_HTML_RESPONSE, ...custom]),
			mergeHeaders([HEADERS_FLIGHT, ...custom]),
		];
		pageHeadersCache.set(module, headers);
	}
	return headers[isFlight ? 1 : 0];
};

export const preparePage = <TStack extends IntegrationRouteStack>(
	request: RequestInput,
	routeStack: TStack,
): PreparedPage<TStack> => {
	const { context, layouts = [], module, modules, params } = routeStack;
	const data = loadRouteData(request, context, params, modules);
	return { context, data, layouts, module, modules, params };
};

export const loadRouteHead = <TElement>(
	request: RequestInput,
	{
		context,
		data,
		modules,
		params,
	}: PreparedPage<IntegrationRouteStack<unknown, unknown, TElement>>,
): Promise<TElement> | TElement | undefined => {
	for (const { head } of modules) {
		if (head) return head(withRequest(request, context, { data, params }));
	}
	return undefined;
};

// Builds resolve each route's stylesheets and page scripts statically, so their tags are
// rendered once per route instead of on every request.
const assetTagsCache = new WeakMap<object, AssetTags>();
const routeAssetTags = (
	module: object,
	modules: Parameters<typeof renderAssetTags>[0],
): AssetTags | Promise<AssetTags> => {
	if (import.meta.env.DEV) return renderAssetTags(modules);
	const cached = assetTagsCache.get(module);
	if (cached) return cached;
	const assets = renderAssetTags(modules);
	if (!(assets instanceof Promise)) assetTagsCache.set(module, assets);
	return assets;
};

export const createPageRenderer =
	<TStack extends IntegrationRouteStack<unknown, unknown, TElement>, TElement>(
		renderTree: (request: RequestInput, page: PreparedPage<TStack>) => Promise<string> | string,
		renderHead: (element: TElement) => Promise<string> | string,
		// URL of the islands runtime, for integrations that render islands.
		islandScript?: string,
	): PageRenderer<TStack> =>
	async (request, routeStack) => {
		const page = preparePage(request, routeStack);
		const routeHead = loadRouteHead<TElement>(request, page);
		const tree = renderTree(request, page);
		const head = routeHead === undefined ? "" : Promise.resolve(routeHead).then(renderHead);
		const assets = routeAssetTags(page.module, page.modules);
		// Promise.all costs about as much as rendering a small page, so it is skipped when only the
		// tree is pending: no head() and, as in builds, cached assets.
		const [html, headHtml, { requested, tags }] =
			head === "" && !(assets instanceof Promise)
				? [await tree, head, assets]
				: await Promise.all([tree, head, assets]);
		return injectIntoHead(
			html,
			headHtml + tags + renderIslandPreloads(html, requested, islandScript),
		);
	};

export const createPageHandlers = <TStack extends IntegrationRouteStack>(
	renderPage: PageRenderer<TStack>,
) => {
	const handlerPage = (
		request: RequestInput,
		routeStack: TStack,
		isFlight = false,
	): Promise<Response> =>
		renderPage(request, routeStack).then(
			(html) =>
				new WrenResponse(html, {
					headers: pageHeaders(routeStack, isFlight),
					status: pageStatus(routeStack),
				}),
			catchResponse,
		);
	return {
		[ENTRY_KIND_API]: handlerApi,
		[ENTRY_KIND_NOT_FOUND]: handlerPage,
		[ENTRY_KIND_PAGE]: handlerPage,
	} satisfies RequestToStackMap<TStack>;
};
