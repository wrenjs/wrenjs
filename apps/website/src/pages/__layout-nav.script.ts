const desktop = window.matchMedia("(min-width: 64rem)");

class WrenNavMenu extends HTMLElement {
  static readonly observedAttributes = ["open"];

  get open() {
    return this.hasAttribute("open");
  }
  set open(value: boolean) {
    this.toggleAttribute("open", value);
  }

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

      document.addEventListener("pointerdown", this.#handleOutsidePointer, {
        capture: true,
        signal,
      });
      document.addEventListener("keydown", this.#handleKeydown, { signal });
    } else if (this.#panel?.contains(document.activeElement)) {
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
    if (event.target instanceof Element && event.target.closest("a[href], wren-link[href]")) {
      this.open = false;
    }
  };

  #handleToggle = () => {
    if (this.open) {
      this.open = false;
      return;
    }

    const viaKeyboard = this.#toggle?.matches(":focus-visible") ?? false;
    this.#syncOrigin();
    this.open = true;
    if (viaKeyboard) {
      this.#panel?.querySelector<HTMLElement>("a[href], wren-link[href], button, summary")?.focus();
    }
  };

  #syncOrigin() {
    const toggle = this.#toggle;
    const panel = this.#panel;
    if (!toggle || !panel) {
      return;
    }
    const { left, width } = toggle.getBoundingClientRect();

    const panelLeft = this.getBoundingClientRect().left + panel.offsetLeft;
    panel.style.setProperty("--nav-origin-x", `${left + width / 2 - panelLeft}px`);
  }
}

if (!customElements.get("wren-nav-menu")) {
  customElements.define("wren-nav-menu", WrenNavMenu);
}
