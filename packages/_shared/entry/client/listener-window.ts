import { isRecord, isResponseDigest } from "../../utils.ts";

const STATE_KEY = "__wrenNavigation";

interface ScrollState {
  x: number;
  y: number;
}

const readScroll = (state: unknown): ScrollState | undefined => {
  const saved = isRecord(state) ? state[STATE_KEY] : undefined;
  return isRecord(saved) && typeof saved.x === "number" && typeof saved.y === "number"
    ? { x: saved.x, y: saved.y }
    : undefined;
};

export const getClientNavigationUrl = (link: Element): undefined | URL => {
  const href = link.getAttribute("href");
  const target = link.getAttribute("target");
  if (!href || link.hasAttribute("download") || (target && target !== "_self")) return undefined;
  if (!URL.canParse(href, document.baseURI)) return undefined;
  const url = new URL(href, document.baseURI);

  if (url.origin !== location.origin) return undefined;
  if (url.pathname === location.pathname && url.search === location.search) return undefined;
  return url;
};

const navigateDocument = (link: Element, event: MouseEvent) => {
  const anchor = document.createElement("a");
  for (const name of ["href", "target", "download", "rel"]) {
    const value = link.getAttribute(name);
    if (value !== null) anchor.setAttribute(name, value);
  }
  if (event.button === 1 || event.metaKey || event.ctrlKey || event.shiftKey) {
    anchor.target = "_blank";
  }
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
};

const decodeHash = (hash: string) => {
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
};

const scrollToDestination = (url: URL, restore?: ScrollState) => {
  if (restore) {
    scrollTo(restore.x, restore.y);
    return;
  }
  const target = url.hash ? document.getElementById(decodeHash(url.hash)) : null;
  if (target) target.scrollIntoView();
  else scrollTo(0, 0);

  const focused = target ?? document.querySelector<HTMLElement>("main") ?? document.body;
  if (!focused.hasAttribute("tabindex")) focused.tabIndex = -1;
  focused.focus({ preventScroll: true });
};

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key !== "Enter" || event.defaultPrevented) return;
  if (event.target instanceof HTMLElement && event.target.matches("wren-link[href]")) {
    event.target.click();
  }
};

export const listenLinks = (navigate?: (url: URL) => void) => {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button > 1 || !(event.target instanceof Element)) return;
    const link = event.target.closest("wren-link[href]");
    if (!link || event.target.closest("a, button, input, select, textarea")) return;
    event.preventDefault();
    const url = getClientNavigationUrl(link);
    const plain =
      event.button === 0 && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
    if (navigate && url && plain) navigate(url);
    else navigateDocument(link, event);
  };

  window.addEventListener("click", onClick);
  window.addEventListener("auxclick", onClick);
  window.addEventListener("keydown", onKeyDown);
};

// Browsers rate-limit history updates (WebKit throws after 100 per 10s), so scroll positions are
// saved once scrolling settles, and at most once a second while it continues.
const SCROLL_SAVE_DELAY = 100;
const SCROLL_SAVE_MAX_WAIT = 1000;

const saveScroll = () => {
  const state: unknown = history.state;
  const previous = isRecord(state) ? state : {};
  try {
    history.replaceState({ ...previous, [STATE_KEY]: { x: scrollX, y: scrollY } }, "");
  } catch {
    // A throttled save only loses a scroll position; it must never block navigation.
  }
};

export const listenNavigation = (navigate: (url: URL, signal: AbortSignal) => Promise<void>) => {
  let rendered = new URL(location.href);
  let controller: AbortController | undefined;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let scrollStart: number | undefined;
  let managed = false;

  // A save still pending after the history entry changes would write into the wrong entry.
  const cancelSave = () => {
    clearTimeout(saveTimer);
    saveTimer = undefined;
    scrollStart = undefined;
  };
  const save = () => {
    cancelSave();
    saveScroll();
  };

  const run = async (url: URL, restore?: ScrollState) => {
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    try {
      await navigate(url, signal);
      if (signal.aborted) return;
      if (!restore) history.pushState({ [STATE_KEY]: { x: 0, y: 0 } }, "", url);
      rendered = url;
      scrollToDestination(url, restore);
    } catch (error) {
      if (signal.aborted) return;
      if (!isResponseDigest(error)) {
        console.error("[wrenjs] Client navigation failed; using browser navigation.", error);
      }
      if (restore) location.reload();
      else location.assign(url.href);
    }
  };
  const onPopState = (event: PopStateEvent) => {
    if (!managed) return;
    cancelSave();
    const url = new URL(location.href);
    const restore = readScroll(event.state);
    if (url.pathname === rendered.pathname && url.search === rendered.search) {
      controller?.abort();
      scrollToDestination(url, restore);
    } else if (restore) {
      void run(url, restore);
    } else {
      location.reload();
    }
  };
  const onScroll = () => {
    if (!managed) return;
    const now = performance.now();
    scrollStart ??= now;
    clearTimeout(saveTimer);
    if (now - scrollStart >= SCROLL_SAVE_MAX_WAIT) save();
    else saveTimer = setTimeout(save, SCROLL_SAVE_DELAY);
  };

  listenLinks((url) => {
    managed = true;
    history.scrollRestoration = "manual";
    save();
    void run(url);
  });
  window.addEventListener("popstate", onPopState);
  window.addEventListener("scroll", onScroll, { passive: true });
};
