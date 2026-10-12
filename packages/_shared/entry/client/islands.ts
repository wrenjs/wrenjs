/** Mounts `Component` onto a server-rendered island; supplied by the framework adapter. */
export type IslandHydrate = (
  element: HTMLElement,
  Component: unknown,
  props: Record<string, unknown>,
  /** Server-rendered HTML of the island's children, to pass back as `children`. */
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

const whenVisible = (element: Element, callback: () => void): (() => void) => {
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    callback();
  });
  // The island itself has no box (`display: contents`); watch its content.
  observer.observe(element.firstElementChild ?? element);
  return () => observer.disconnect();
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Defines `<wren-island>`, which hydrates itself with `hydrate` per its `data-hydrate` strategy. */
export const defineIslands = (hydrate: IslandHydrate): void => {
  if (customElements.get("wren-island")) return;

  class WrenIslandElement extends HTMLElement {
    #cancel?: () => void;
    #started = false;

    connectedCallback() {
      if (this.#started) return;
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
        const slot = this.querySelector(":scope > template[data-slot]");
        const slotHtml = slot?.innerHTML;
        slot?.remove();
        const module: Record<string, unknown> = await import(/* @vite-ignore */ src);
        const Component = module[name];
        if (!Component) throw new Error(`Export "${name}" not found in ${src}.`);
        const props: unknown = JSON.parse(this.getAttribute("props") ?? "{}");
        if (!isRecord(props)) throw new Error("Island props must be an object.");
        await hydrate(this, Component, props, slotHtml);
      } catch (error) {
        console.error("[wrenjs] Unable to hydrate island.", this, error);
      }
    }
  }

  document.head.insertAdjacentHTML("beforeend", STYLE);
  customElements.define("wren-island", WrenIslandElement);
};
