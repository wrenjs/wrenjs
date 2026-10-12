// Mirrors the `lg` breakpoint, where the links render inline instead.
const desktop = window.matchMedia("(min-width: 64rem)");

class WrenNavMenu extends HTMLElement {
  static readonly observedAttributes = ["open"];

  get open() {
    return this.hasAttribute("open");
  }
  set open(value: boolean) {
    this.toggleAttribute("open", value);
  }

  /** Document-level light-dismiss listeners; only live while open. */
  #dismissal: AbortController | null = null;

  #listeners: AbortController | null = null;

  #panel: HTMLElement | null = null;

  #toggle: HTMLButtonElement | null = null;

  attributeChangedCallback(_name: string, _oldValue: null | string, newValue: null | string) {
    const open = newValue !== null;
    this.#toggle?.setAttribute("aria-expanded", String(open));
    this.#dismissal?.abort();

    if (open) {
      const { signal } = (this.#dismissal = new AbortController());
      // Capture sees taps that other handlers stop from propagating.
      document.addEventListener("pointerdown", this.#handleOutsidePointer, {
        capture: true,
        signal,
      });
      document.addEventListener("keydown", this.#handleKeydown, { signal });
    } else if (this.#panel?.contains(document.activeElement)) {
      // Hiding the panel would drop focus to the body. A focusout-triggered close
      // never gets here: the active element is already the body by then.
      this.#toggle?.focus();
    }
  }

  connectedCallback() {
    this.#toggle = this.querySelector("[data-nav-menu-toggle]");
    this.#panel = this.querySelector("[data-nav-menu-panel]");
    if (!this.#toggle || !this.#panel) {
      throw new Error("Nav menu toggle or panel markup is missing");
    }

    const { signal } = (this.#listeners = new AbortController());
    this.#toggle.addEventListener("click", this.#handleToggle, { signal });
    this.#panel.addEventListener("click", this.#handlePanelClick, { signal });
    this.addEventListener("focusout", this.#handleFocusOut, { signal });
    desktop.addEventListener("change", this.#handleDesktop, { signal });
  }

  disconnectedCallback() {
    this.#listeners?.abort();
    this.open = false;
    this.#toggle = null;
    this.#panel = null;
  }

  #handleDesktop = (event: MediaQueryListEvent) => {
    if (event.matches) {
      this.open = false;
    }
  };

  #handleFocusOut = (event: FocusEvent) => {
    const next = event.relatedTarget;
    if (next instanceof Node && !this.contains(next)) {
      this.open = false;
    }
  };

  #handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      this.open = false;
    }
  };

  #handleOutsidePointer = (event: PointerEvent) => {
    if (!event.composedPath().includes(this)) {
      this.open = false;
    }
  };

  #handlePanelClick = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      this.open = false;
    }
  };

  #handleToggle = () => {
    if (this.open) {
      this.open = false;
      return;
    }
    // Keyboard users expect focus to land in the menu; pointer users keep theirs.
    const viaKeyboard = this.#toggle?.matches(":focus-visible") ?? false;
    this.#syncOrigin();
    this.open = true;
    if (viaKeyboard) {
      this.#panel?.querySelector<HTMLElement>("a, button")?.focus();
    }
  };

  /** Points the panel's transform origin at the toggle so it grows out of the button. */
  #syncOrigin() {
    const toggle = this.#toggle;
    const panel = this.#panel;
    if (!toggle || !panel) {
      return;
    }
    const { left, width } = toggle.getBoundingClientRect();
    // The closed panel is scaled down, so derive its layout edge from offsets.
    const panelLeft = this.getBoundingClientRect().left + panel.offsetLeft;
    panel.style.setProperty("--nav-origin-x", `${left + width / 2 - panelLeft}px`);
  }
}

if (!customElements.get("wren-nav-menu")) {
  customElements.define("wren-nav-menu", WrenNavMenu);
}
