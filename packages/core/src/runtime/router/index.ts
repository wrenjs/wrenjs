import {
	dynamicNotFounds,
	dynamicRoutes,
	staticNotFounds,
	staticRoutes,
} from "virtual:wrenjs-routes";

import type { RouteEntry, RouteStack, WrenContext } from "#/types.js";

import { extractPathname } from "#shared/utils.ts";

import { trieLookup } from "./trie-lookup.ts";

export type { RouteModule, RouteStack } from "#/types.js";

const loadStack = (
	{ kind, stack }: RouteEntry,
	params: Record<string, string>,
	context: WrenContext,
): Promise<RouteStack> | RouteStack => {
	const loaded = stack();
	return loaded instanceof Promise
		? loaded.then((modules) => ({ ...modules, context, kind, params }))
		: { ...loaded, context, kind, params };
};

const LONGEST_STATIC_NOT_FOUND = Math.max(
	0,
	...Object.keys(staticNotFounds ?? {}).map((key) => key.length),
);

const matchNotFound = (pathname: string, values: string[]): RouteEntry | undefined => {
	for (let path = pathname; ; path = path.slice(0, path.lastIndexOf("/")) || "/") {
		const entry =
			(path.length <= LONGEST_STATIC_NOT_FOUND ? staticNotFounds?.[path] : undefined)
			?? trieLookup(dynamicNotFounds, path, values);
		if (entry || path === "/") return entry;
	}
};

export function matchRouteToStack<T extends RouteStack = RouteStack>(
	path?: string,
	context?: WrenContext,
): Promise<T | undefined> | T | undefined;
export function matchRouteToStack(
	path?: string,
	context = {} as WrenContext,
): Promise<RouteStack | undefined> | RouteStack | undefined {
	const pathname = extractPathname(path);
	if (!pathname) return undefined;

	const staticEntry = staticRoutes?.[pathname];
	if (staticEntry) return loadStack(staticEntry, {}, context);

	const values: string[] = [];
	const matchedEntry =
		trieLookup(dynamicRoutes, pathname, values) ?? matchNotFound(pathname, values);
	if (!matchedEntry) return undefined;

	const names = matchedEntry.params ?? [];
	const params: Record<string, string> = {};
	for (let i = 0; i < names.length; i++) {
		params[names[i]] = values[i];
	}
	return loadStack(matchedEntry, params, context);
}
