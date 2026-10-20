import { kind, render } from "virtual:wrenjs-link-client";
import { LINK_INVALIDATE_EVENT } from "#shared/constants.ts";
import {
  getClientNavigationUrl,
  listenLinks,
  listenNavigation,
} from "#shared/entry/client/listener-window.ts";
import { createFlightRequest } from "#shared/entry/client/request.ts";
import type { Prefetch } from "./types.js";

interface CacheEntry {
  controller: AbortController;
  created: number;
  response: Promise<Response | undefined>;
}
type NetworkInformation = { effectiveType?: string; saveData?: boolean };

const HOVER_DELAY = 80;
const CACHE_LIMIT = 20;
const CACHE_TTL = 30_000;
const PREFETCH_ATTRIBUTE = "data-prefetch";
const PREFETCH_MODES: Record<string, Prefetch> = {
  "": true,
  false: false,
  hover: "hover",
  "on-load": "on-load",
  true: true,
  visible: "visible",
};
const cache = new Map<string, CacheEntry>();
const hinted = new Set<string>();

const canPrefetch = () => {
  const { connection, onLine } = navigator as Navigator & { connection?: NetworkInformation };
  return onLine && !connection?.saveData && !connection?.effectiveType?.includes("2g");
};
const withoutHash = (url: URL) => {
  const key = new URL(url);
  key.hash = "";
  return key.href;
};
const evict = (href: string) => {
  cache.get(href)?.controller.abort();
  cache.delete(href);
};
const clearCache = () => {
  for (const href of cache.keys()) evict(href);
};
// Non-Flight responses (redirects, thrown or proxy Responses, errors) resolve `undefined`.
const fetchFlight = async (href: string, signal: AbortSignal): Promise<Response | undefined> => {
  const response = await fetch(createFlightRequest(href), { signal });
  if (response.headers.get("content-type")?.startsWith("text/x-component")) return response;
  await response.body?.cancel();
  return undefined;
};

const getFlight = (href: string): CacheEntry => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.created >= CACHE_TTL) evict(key);
  }
  const cached = cache.get(href);
  if (cached) return cached;
  if (cache.size >= CACHE_LIMIT) evict(cache.keys().next().value!);
  const controller = new AbortController();
  const entry = { controller, created: now, response: fetchFlight(href, controller.signal) };
  cache.set(href, entry);
  void entry.response.catch(() => {
    if (cache.get(href) === entry) cache.delete(href);
  });
  return entry;
};
const prefetchRoute = async (link: HTMLElement) => {
  const url = canPrefetch() ? getClientNavigationUrl(link) : undefined;
  if (!url) return;
  const href = withoutHash(url);
  if (kind === "flight") {
    await getFlight(href).response;
  } else if (kind === "document" && !hinted.has(href)) {
    hinted.add(href);
    const hint = document.createElement("link");
    hint.rel = "prefetch";
    hint.as = "document";
    hint.href = href;
    document.head.append(hint);
  }
};

class WrenLinkElement extends HTMLElement {
  static readonly observedAttributes = [PREFETCH_ATTRIBUTE, "href"];

  get prefetch(): Prefetch {
    const value = this.getAttribute(PREFETCH_ATTRIBUTE);
    if (value === null) return "hover";
    if (Object.hasOwn(PREFETCH_MODES, value)) return PREFETCH_MODES[value];
    console.warn("[wrenjs] Invalid Link prefetch mode:", value);
    return false;
  }

  #events?: AbortController;
  #timer?: ReturnType<typeof setTimeout>;
  #visible?: IntersectionObserver;

  attributeChangedCallback() {
    if (this.isConnected) this.#setup();
  }

  connectedCallback() {
    this.#events = new AbortController();
    const { signal } = this.#events;
    this.addEventListener("mouseenter", this.#onHover, { signal });
    this.addEventListener("focus", this.#onHover, { signal });
    this.addEventListener("mouseleave", this.#onLeave, { signal });
    this.addEventListener("blur", this.#onLeave, { signal });
    this.#setup();
  }

  disconnectedCallback() {
    this.#cancel();
    this.#events?.abort();
  }

  #cancel() {
    this.#onLeave();
    this.#visible?.disconnect();
    this.#visible = undefined;
  }

  readonly #onHover = () => {
    this.#onLeave();
    const { prefetch } = this;
    if (prefetch === true || prefetch === "hover") {
      this.#timer = setTimeout(() => this.#prefetch(), HOVER_DELAY);
    }
  };

  readonly #onLeave = () => {
    clearTimeout(this.#timer);
    this.#timer = undefined;
  };

  #prefetch() {
    void prefetchRoute(this).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("[wrenjs] Unable to prefetch Link.", error);
    });
  }

  #setup() {
    this.#cancel();
    if (!this.hasAttribute("href")) return;

    if (!this.hasAttribute("role")) this.setAttribute("role", "link");
    if (!this.hasAttribute("tabindex")) this.tabIndex = 0;
    const { prefetch } = this;
    if (prefetch === "on-load") this.#prefetch();
    else if (prefetch === "visible") {
      this.#visible = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        this.#visible?.disconnect();
        this.#prefetch();
      });
      this.#visible.observe(this);
    }
  }
}

if (!customElements.get("wren-link")) {
  document.head.insertAdjacentHTML(
    "beforeend",
    "<style>:where(wren-link[href]){color:inherit;cursor:pointer}</style>",
  );
  customElements.define("wren-link", WrenLinkElement);
  window.addEventListener(LINK_INVALIDATE_EVENT, clearCache);
  if (kind === "flight") {
    listenNavigation(async (url, signal) => {
      const href = withoutHash(url);
      const entry = getFlight(href);
      cache.delete(href);
      signal.addEventListener("abort", () => entry.controller.abort(), { once: true });
      const response = await entry.response;
      signal.throwIfAborted();
      if (!response) {
        // Let the browser navigate (and follow any redirect). This navigation never settles.
        location.assign(url);
        return new Promise<never>(() => {});
      }
      return render(response, signal);
    });
  } else {
    listenLinks();
  }
}
