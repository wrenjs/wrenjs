import type { ComponentType } from "preact";
import { h, hydrate } from "preact";
import { defineIslands } from "#shared/entry/client/islands.ts";

export { renderDocument as renderNavigation } from "#shared/entry/client/document.ts";

defineIslands((element, Component, props, slotHtml) => {
  // Preact leaves `dangerouslySetInnerHTML` content alone while hydrating, so the
  // server-rendered children stay in place (including any islands among them).
  const children =
    slotHtml === undefined
      ? undefined
      : h("wren-slot", { dangerouslySetInnerHTML: { __html: slotHtml } });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The facade only wraps components.
  const Island = Component as ComponentType<Record<string, unknown>>;
  hydrate(h(Island, { ...props, children }), element);
});
