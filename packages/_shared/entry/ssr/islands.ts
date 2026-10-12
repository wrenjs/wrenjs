export type HydrateStrategy = "idle" | "load" | "visible";

/** Attributes of the `<wren-island>` element; the browser runtime reads them to hydrate. */
export interface IslandAttributes {
  "data-hydrate"?: HydrateStrategy;
  export: string;
  props: string;
  src: string;
}

export interface SerializedIsland<TChildren> {
  attributes: IslandAttributes;
  children: TChildren | undefined;
  /** The component's props without `children` and `data-hydrate`. */
  props: Record<string, unknown>;
}

const HYDRATE_ATTRIBUTE = "data-hydrate";
const STRATEGIES = new Set<string>(["idle", "load", "visible"]);
const isStrategy = (value: unknown): value is HydrateStrategy =>
  typeof value === "string" && STRATEGIES.has(value);

const isPlain = (value: object) => {
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

function replacer(this: Record<string, unknown>, key: string, value: unknown): unknown {
  // `value` may already be `toJSON()`ed (Dates become strings); inspect the original.
  const original = this[key];
  const type = typeof original;
  const isObject = typeof original === "object" && original !== null;
  const invalid =
    type === "function" ||
    type === "symbol" ||
    type === "bigint" ||
    (isObject && !Array.isArray(original) && !isPlain(original));
  if (invalid) {
    const name = key === "" ? "props" : `prop "${key}"`;
    throw new TypeError(
      `Island ${name} must be JSON-serializable (plain objects, arrays and primitives); got ${isObject ? original.constructor.name : type}.`,
    );
  }
  return value;
}

/**
 * Splits a component's props into what the `<wren-island>` element carries, the
 * children (rendered by the framework adapter), and the props handed to the component.
 */
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
  const attributes: IslandAttributes = {
    export: island.export,
    props: JSON.stringify(rest, replacer),
    src: island.src,
  };
  if (hydrate) attributes[HYDRATE_ATTRIBUTE] = hydrate;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The adapter knows its framework's children type.
  return { attributes, children: children as TChildren | undefined, props: rest };
};
