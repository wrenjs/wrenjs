const STATE_KEY = "__wrenNavigation";

interface ScrollState {
  x: number;
  y: number;
}

const readScroll = (state: unknown): ScrollState | undefined => {
  if (typeof state !== "object" || state === null || !(STATE_KEY in state)) return undefined;
  const saved: unknown = state[STATE_KEY];
  if (typeof saved !== "object" || saved === null || !("x" in saved) || !("y" in saved)) {
    return undefined;
  }
  return typeof saved.x === "number" && typeof saved.y === "number"
    ? { x: saved.x, y: saved.y }
    : undefined;
};

/** The same-origin destination of a Link when its click can be handled in-document. */
export const getClientNavigationUrl = (link: Element): undefined | URL => {
  const href = link.getAttribute("href");
  const target = link.getAttribute("target");
  if (!href || link.hasAttribute("download") || (target && target !== "_self")) return undefined;
  if (!URL.canParse(href, document.baseURI)) return undefined;
  const url = new URL(href, document.baseURI);
  // Same-document (hash) navigation stays native.
  if (url.origin !== location.origin) return undefined;
  if (url.pathname === location.pathname && url.search === location.search) return undefined;
  return url;
};

/** Hands a click Wren does not handle itself to the browser, through a throwaway anchor. */
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
  // Move focus into the new content for keyboard and assistive-technology users.
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

/** Makes `<wren-link href>` behave like an anchor; `navigate` takes over plain same-origin clicks. */
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
  // Window-level, so handlers frameworks delegate to `document` can still preventDefault.
  window.addEventListener("click", onClick);
  window.addEventListener("auxclick", onClick);
  window.addEventListener("keydown", onKeyDown);
};

const saveScroll = () => {
  const state: unknown = history.state;
  const previous = typeof state === "object" && state !== null ? state : {};
  history.replaceState({ ...previous, [STATE_KEY]: { x: scrollX, y: scrollY } }, "");
};

/** Client-side navigation for Links, with history, scroll restoration and browser fallback. */
export const listenNavigation = (navigate: (url: URL, signal: AbortSignal) => Promise<void>) => {
  let rendered = new URL(location.href);
  let controller: AbortController | undefined;
  let scrollFrame: number | undefined;
  let managed = false;

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
      console.error("[wrenjs] Client navigation failed; using browser navigation.", error);
      if (restore) location.reload();
      else location.assign(url.href);
    }
  };
  const onPopState = (event: PopStateEvent) => {
    if (!managed) return;
    const url = new URL(location.href);
    const restore = readScroll(event.state);
    if (url.pathname === rendered.pathname && url.search === rendered.search) {
      controller?.abort();
      scrollToDestination(url, restore);
    } else if (restore) {
      void run(url, restore);
    } else {
      // An entry Wren did not create; let the browser rebuild the document.
      location.reload();
    }
  };
  const onScroll = () => {
    scrollFrame ??= requestAnimationFrame(() => {
      scrollFrame = undefined;
      if (managed) saveScroll();
    });
  };

  listenLinks((url) => {
    managed = true;
    history.scrollRestoration = "manual";
    saveScroll();
    void run(url);
  });
  window.addEventListener("popstate", onPopState);
  window.addEventListener("scroll", onScroll, { passive: true });
};
