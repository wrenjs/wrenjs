const STYLESHEETS = 'link[rel="stylesheet"]';
const TIMESTAMP_RE = /[?&]t=\d{13}$/;

const whenLoaded = (link: HTMLLinkElement) =>
  new Promise<boolean>((resolve) => {
    link.addEventListener("load", () => resolve(true), { once: true });
    link.addEventListener("error", () => resolve(false), { once: true });
  });

const syncAttributes = (target: Element, source: Element) => {
  for (const name of Array.from(target.attributes, (attribute) => attribute.name)) {
    if (!source.hasAttribute(name)) target.removeAttribute(name);
  }
  for (const { name, value } of source.attributes) target.setAttribute(name, value);
};

const stylesheets = ({ head }: Document) =>
  new Map<string, Element>(
    Array.from(head.querySelectorAll<HTMLLinkElement>(STYLESHEETS), (link) => [
      import.meta.env.DEV ? link.href.replace(TIMESTAMP_RE, "") : link.href,
      link,
    ]),
  );

export const refreshStylesheet = async (link: HTMLLinkElement): Promise<void> => {
  if (link.disabled || !link.href.startsWith(`${location.origin}/`)) return;
  const href = link.href.replace(TIMESTAMP_RE, "");
  const fresh = document.createElement("link");
  syncAttributes(fresh, link);
  fresh.href = `${href}${href.includes("?") ? "&" : "?"}t=${Date.now()}`;
  link.after(fresh);
  ((await whenLoaded(fresh)) ? link : fresh).remove();
};

const syncStylesheet = async (link: Element, existing?: Element) => {
  if (!existing) {
    const added = document.createElement("link");
    syncAttributes(added, link);
    document.head.append(added);
    await whenLoaded(added);
  } else if (import.meta.env.DEV && existing instanceof HTMLLinkElement) {
    await refreshStylesheet(existing);
  }
};

const reviveScript = (script: HTMLScriptElement) => {
  const fresh = document.createElement("script");
  syncAttributes(fresh, script);
  fresh.textContent = script.textContent;
  script.replaceWith(fresh);
};

export const renderDocument = async (response: Response, signal: AbortSignal): Promise<void> => {
  const next = new DOMParser().parseFromString(await response.text(), "text/html");
  signal.throwIfAborted();

  const current = stylesheets(document);
  for (const style of document.head.querySelectorAll<HTMLStyleElement>("style[data-href]")) {
    current.set(new URL(style.dataset.href!, document.baseURI).href, style);
  }
  const wanted = stylesheets(next);
  await Promise.all(Array.from(wanted, ([href, link]) => syncStylesheet(link, current.get(href))));
  signal.throwIfAborted();

  for (const [href, link] of current) if (!wanted.has(href)) link.remove();
  document.title = next.title;
  for (const meta of document.head.querySelectorAll("meta")) meta.remove();
  document.head.prepend(...next.head.querySelectorAll("meta"));
  syncAttributes(document.documentElement, next.documentElement);
  syncAttributes(document.body, next.body);
  for (const script of document.head.querySelectorAll("script")) script.remove();
  for (const script of next.head.querySelectorAll("script")) {
    document.head.append(script);
    reviveScript(script);
  }
  document.body.replaceChildren(...next.body.childNodes);
  for (const script of document.body.querySelectorAll("script")) reviveScript(script);
};
