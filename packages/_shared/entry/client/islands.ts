import { isRecord } from "../../utils.ts";

export type IslandHydrate = (
  element: HTMLElement,
  Component: unknown,
  props: Record<string, unknown>,

  slotHtml: string | undefined,
) => Promise<void> | void;

const STYLE = "<style>:where(wren-island,wren-slot){display:contents}</style>";

const whenIdle = (callback: () => void): (() => void) => {
  if ("requestIdleCallback" in window) {
    const id = requestIdleCallback(callback);
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(callback, 200);
  return () => clearTimeout(id);
};

// Islands and slots are `display: contents`, so only their children have boxes to observe.
const CONTENTS_TAGS: ReadonlySet<string> = new Set(["wren-island", "wren-slot"]);

const observableBoxes = (element: Element): Element[] =>
  Array.from(element.children).flatMap((child) => {
    if (child.localName === "template") return [];
    return CONTENTS_TAGS.has(child.localName) ? observableBoxes(child) : [child];
  });

const whenVisible = (element: Element, callback: () => void): (() => void) => {
  const targets = observableBoxes(element);
  // Output without elements (e.g. only text) can't be observed, so hydrate when idle instead.
  if (targets.length === 0) return whenIdle(callback);
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    callback();
  });

  for (const target of targets) observer.observe(target);
  return () => observer.disconnect();
};

const ownSlot = (island: Element): Element | undefined => {
  for (const slot of island.querySelectorAll("wren-slot")) {
    if (slot.closest("wren-island") === island) return slot;
  }
  return undefined;
};

const takeSlotHtml = (island: Element): string | undefined => {
  const template = island.querySelector(":scope > template[data-slot]");
  if (!template) return ownSlot(island)?.innerHTML;
  const html = template.innerHTML;
  template.remove();
  return html;
};

export const defineIslands = (hydrate: IslandHydrate): void => {
  if (customElements.get("wren-island")) return;

  class WrenIslandElement extends HTMLElement {
    #cancel?: () => void;
    #slotHtml?: string;
    #started = false;

    connectedCallback() {
      if (this.#started) return;
      // Read before this or any nested island hydrates, while the slot still holds server HTML.
      this.#slotHtml ??= takeSlotHtml(this);
      const start = () => {
        this.#cancel = undefined;
        this.#started = true;
        void this.#hydrate();
      };
      const strategy = this.getAttribute("data-hydrate");
      if (strategy === "visible") this.#cancel = whenVisible(this, start);
      else if (strategy === "idle") this.#cancel = whenIdle(start);
      else start();
    }

    disconnectedCallback() {
      this.#cancel?.();
      this.#cancel = undefined;
    }

    async #hydrate() {
      const src = this.getAttribute("src");
      const name = this.getAttribute("export") ?? "default";
      try {
        if (!src) throw new Error("Missing src.");
        const module: Record<string, unknown> = await import(src);
        const Component = module[name];
        if (!Component) throw new Error(`Export "${name}" not found in ${src}.`);
        const props: unknown = JSON.parse(this.getAttribute("props") ?? "{}");
        if (!isRecord(props)) throw new Error("Island props must be an object.");
        await hydrate(this, Component, props, this.#slotHtml);
      } catch (error) {
        console.error("[wrenjs] Unable to hydrate island.", this, error);
      }
    }
  }

  document.head.insertAdjacentHTML("beforeend", STYLE);
  customElements.define("wren-island", WrenIslandElement);
};
