import { kind, render } from "virtual:wrenjs-link-client";

import { FLIGHT_MIME_TYPE, LINK_INVALIDATE_EVENT } from "#shared/constants.ts";
import {
	getClientNavigationUrl,
	listenLinks,
	listenNavigation,
} from "#shared/entry/client/listener-window.ts";
import { createFlightRequest } from "#shared/entry/client/request.ts";

import type { Prefetch } from "./types.js";

interface NetworkInformation {
	effectiveType?: string;
	saveData?: boolean;
}
const PREFETCH_ATTRIBUTE = "data-prefetch";
const PREFETCH_MODES: Record<string, Prefetch> = {
	"": true,
	"false": false,
	"hover": "hover",
	"on-load": "on-load",
	"true": true,
	"visible": "visible",
};
const NOOP = () => {};
const flightCache = new Map<
	string,
	{ controller: AbortController; response: Promise<Response | undefined> }
>();
const prefetched = new Set<string>();

const canPrefetch = () => {
	const { connection, onLine } = navigator as Navigator & { connection?: NetworkInformation };
	return onLine && !connection?.saveData && !connection?.effectiveType?.includes("2g");
};
const withoutHash = (url: URL) => {
	const key = new URL(url);
	key.hash = "";
	return key.href;
};
// Non-Flight responses (redirects, thrown or proxy Responses, errors) resolve `undefined`.
const fetchFlight = async (href: string, signal: AbortSignal): Promise<Response | undefined> => {
	const response = await fetch(createFlightRequest(href), { signal });
	if (response.headers.get("content-type") === FLIGHT_MIME_TYPE) {
		return response;
	}
	await response.body?.cancel();
	return undefined;
};

const getFlight = (href: string) => {
	const controller = new AbortController();
	if (flightCache.has(href)) {
		return { ...flightCache.get(href) };
	}
	const entry = { controller, response: fetchFlight(href, controller.signal) };
	void entry.response.catch(() => {
		if (flightCache.has(href)) {
			flightCache.delete(href);
		}
	});
	return entry;
};

const prefetchRoute = (link: HTMLElement) => {
	const url = canPrefetch() ? getClientNavigationUrl(link) : undefined;
	if (!url) {
		return;
	}
	const href = withoutHash(url);
	if (!prefetched.has(href)) {
		prefetched.add(href);
	} else {
		return;
	}
	if (kind === "flight") {
		const entry = getFlight(href);
		// Browser needs extra help to use this
		flightCache.set(href, entry);
		void entry.response.catch(NOOP);
		return [href, entry];
	}
	if (kind === "document") {
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
		if (value === null) {
			return "hover";
		}
		if (Object.hasOwn(PREFETCH_MODES, value)) {
			return PREFETCH_MODES[value];
		}
		return false;
	}

	#abort?: AbortController;
	#visible?: IntersectionObserver;

	attributeChangedCallback(_name: string, oldValue: null | string, newValue: null | string) {
		if (oldValue !== newValue && this.#abort?.signal.aborted === false) {
			this.#setup();
		}
	}

	connectedCallback() {
		this.#abort = new AbortController();
		const { signal } = this.#abort;
		this.addEventListener("mouseenter", this.#onHover, { signal });
		this.addEventListener("focus", this.#onHover, { signal });
		this.#setup();
	}

	disconnectedCallback() {
		this.#cancel();
		this.#abort?.abort();
	}

	#cancel() {
		this.#visible?.disconnect();
		this.#visible = undefined;
	}

	readonly #onHover = () => {
		const { prefetch } = this;
		if (prefetch !== true && prefetch !== "hover") {
			return;
		}
		prefetchRoute(this);
	};

	#setup() {
		this.#cancel();
		if (!this.hasAttribute("href")) {
			return;
		}

		if (!this.hasAttribute("role")) {
			this.setAttribute("role", "link");
		}

		if (!this.hasAttribute("tabindex")) {
			this.tabIndex = 0;
		}
		const { prefetch } = this;
		if (prefetch === "on-load") {
			prefetchRoute(this);
		} else if (prefetch === "visible") {
			this.#visible = new IntersectionObserver((entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) {
					return;
				}
				this.#visible?.disconnect();
				prefetchRoute(this);
			});
			this.#visible.observe(this);
		}
	}
}
const clearCache = () => {
	for (const [href, entry] of flightCache.entries()) {
		entry.controller.abort();
		flightCache.delete(href);
	}
};

if (!customElements.get("wren-link")) {
	document.head.insertAdjacentHTML(
		"beforeend",
		"<style>:where(wren-link[href]){cursor:pointer}</style>",
	);
	customElements.define("wren-link", WrenLinkElement);
	window.addEventListener(LINK_INVALIDATE_EVENT, clearCache);
	window.addEventListener("beforeunload", clearCache);
	window.addEventListener("pagehide", clearCache);
	import.meta.hot?.on("vite:beforeUpdate", clearCache);
	if (kind === "flight") {
		listenNavigation(async (url, signal) => {
			const href = withoutHash(url);
			const entry = getFlight(href);
			flightCache.delete(href);
			signal.addEventListener("abort", () => entry.controller.abort(), { once: true });
			const response = await entry.response;
			signal.throwIfAborted();
			if (!response) {
				// Let the browser navigate (and follow any redirect). This navigation never settles.
				location.assign(url);
				return new Promise<never>(NOOP);
			}
			return render(response, signal);
		});
	} else {
		listenLinks();
	}
}
