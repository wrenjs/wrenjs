import type { ComponentChildren, ComponentType, FunctionComponent } from "preact";
import { createContext, h } from "preact";
import { useContext } from "preact/hooks";
import { serializeIsland } from "#shared/entry/ssr/islands.ts";

/** True while rendering inside an island: nested islands render plain so hydration matches. */
const IslandContext = createContext(false);

/** Children render outside the island so islands among them hydrate on their own. */
const outside = (content: ComponentChildren) =>
  h(IslandContext.Provider, { value: false }, content);

/** Components are PascalCase (or the default export); other exports pass through unchanged. */
const isComponentExport = (name: string) => name === "default" || /^[A-Z]/.test(name);

/**
 * Wraps a `"use client"` component so the server renders it inside a `<wren-island>`
 * carrying everything the browser runtime needs to hydrate it: the module URL, export
 * name, JSON props, and the children as a `<template>` slot.
 */
export const island = <T,>(value: T, src: string, name: string): T => {
  if (typeof value !== "function" || !isComponentExport(name)) return value;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Any function export here is a component.
  const Component = value as unknown as ComponentType<Record<string, unknown>>;
  const Island: FunctionComponent<Record<string, unknown>> = (rawProps) => {
    if (useContext(IslandContext)) return h(Component, rawProps);
    const { attributes, children, props } = serializeIsland<ComponentChildren>(rawProps, {
      export: name,
      src,
    });
    const slot = children === undefined ? undefined : h("wren-slot", null, outside(children));
    return h(
      "wren-island",
      attributes,
      h(IslandContext.Provider, { value: true }, h(Component, { ...props, children: slot })),
      slot && h("template", { "data-slot": "" }, outside(children)),
    );
  };
  Island.displayName = `Island(${name})`;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Same call signature as the wrapped component.
  return Island as unknown as T;
};
