export type HydrateStrategy = "idle" | "load" | "visible";

export interface IslandAttributes {
	"data-hydrate"?: HydrateStrategy;
	"export": string;
	"props": string;
	"src": string;
}

export interface SerializedIsland<TChildren> {
	attributes: IslandAttributes;
	children: TChildren | undefined;

	props: Record<string, unknown>;
}

const HYDRATE_ATTRIBUTE = "data-hydrate";
const STRATEGIES = new Set<string>(["idle", "load", "visible"]);
const isStrategy = (value: unknown): value is HydrateStrategy =>
	typeof value === "string" && STRATEGIES.has(value);

const ISLAND_RE = /<wren-island(?=[\s/>])((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const ATTRIBUTE_RE = /([^\s"'/=>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;

export const eagerIslandSources = (html: string): string[] => {
	const sources: string[] = [];
	if (!html.includes("<wren-island")) return sources;
	for (const [, attributes = ""] of html.matchAll(ISLAND_RE)) {
		let src: string | undefined;
		let hydrate: string | undefined;
		for (const [, name, double, single] of attributes.matchAll(ATTRIBUTE_RE)) {
			if (name === "src") src = double ?? single;
			else if (name === HYDRATE_ATTRIBUTE) hydrate = double ?? single;
		}
		if (src && hydrate !== "visible" && hydrate !== "idle") sources.push(src);
	}
	return sources;
};

const isPlain = (value: object) => {
	const prototype: unknown = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
};

const assertSerializable = (value: unknown, key: number | string, ancestors: object[]): void => {
	const type = typeof value;
	const isObject = typeof value === "object" && value !== null;
	const invalid =
		type === "function"
		|| type === "symbol"
		|| type === "bigint"
		|| (isObject && !Array.isArray(value) && !isPlain(value));
	if (invalid) {
		const name = key === "" ? "props" : `prop "${key}"`;
		throw new TypeError(
			`Island ${name} must be JSON-serializable (plain objects, arrays and primitives); got ${isObject ? value.constructor.name : type}.`,
		);
	}
	if (!isObject || ancestors.includes(value)) return;
	ancestors.push(value);
	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index++) {
			assertSerializable(value[index], index, ancestors);
		}
	} else {
		for (const name of Object.keys(value)) {
			assertSerializable(Reflect.get(value, name), name, ancestors);
		}
	}
	ancestors.pop();
};

export const serializeIsland = <TChildren>(
	props: Record<string, unknown>,
	island: { export: string; src: string },
): SerializedIsland<TChildren> => {
	const { children, [HYDRATE_ATTRIBUTE]: hydrate, ...rest } = props;
	if (hydrate !== undefined && !isStrategy(hydrate)) {
		throw new TypeError(
			`Invalid ${HYDRATE_ATTRIBUTE} for island "${island.export}": ${JSON.stringify(hydrate)}. Use "load", "visible" or "idle".`,
		);
	}
	assertSerializable(rest, "", []);
	const attributes: IslandAttributes = {
		export: island.export,
		props: JSON.stringify(rest),
		src: island.src,
	};
	if (hydrate) attributes[HYDRATE_ATTRIBUTE] = hydrate;

	return { attributes, children: children as TChildren | undefined, props: rest };
};
