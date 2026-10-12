const STYLESHEETS = 'link[rel="stylesheet"]';

const whenLoaded = (link: HTMLLinkElement) =>
  new Promise<void>((resolve) => {
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => resolve(), { once: true });
  });

const syncAttributes = (target: Element, source: Element) => {
  for (const name of Array.from(target.attributes, (attribute) => attribute.name)) {
    if (!source.hasAttribute(name)) target.removeAttribute(name);
  }
  for (const { name, value } of source.attributes) target.setAttribute(name, value);
};

/** Parsed scripts never execute; a fresh element created by this document does. */
const reviveScript = (script: HTMLScriptElement) => {
  const fresh = document.createElement("script");
  syncAttributes(fresh, script);
  fresh.textContent = script.textContent;
  script.replaceWith(fresh);
};

/**
 * Renders an HTML-document "flight" in place: new stylesheets load before the swap,
 * `<title>`/`<meta>` and root attributes are synced, `<body>` is replaced, and its
 * scripts re-run. Scripts in `<head>` (runtimes, Vite's client) are left alone.
 */
export const renderDocument = async (response: Response, signal: AbortSignal): Promise<void> => {
  const next = new DOMParser().parseFromString(await response.text(), "text/html");
  signal.throwIfAborted();

  const current = new Map(
    [...document.head.querySelectorAll<HTMLLinkElement>(STYLESHEETS)].map((link) => [
      link.href,
      link,
    ]),
  );
  const wanted = new Set<string>();
  const loading: Promise<void>[] = [];
  for (const link of next.head.querySelectorAll<HTMLLinkElement>(STYLESHEETS)) {
    wanted.add(link.href);
    if (current.has(link.href)) continue;
    const added = document.createElement("link");
    syncAttributes(added, link);
    loading.push(whenLoaded(added));
    document.head.append(added);
  }
  await Promise.all(loading);
  signal.throwIfAborted();

  for (const [href, link] of current) if (!wanted.has(href)) link.remove();
  document.title = next.title;
  for (const meta of document.head.querySelectorAll("meta")) meta.remove();
  document.head.prepend(...next.head.querySelectorAll("meta"));
  syncAttributes(document.documentElement, next.documentElement);
  syncAttributes(document.body, next.body);
  document.body.replaceChildren(...next.body.childNodes);
  for (const script of document.body.querySelectorAll("script")) reviveScript(script);
};
