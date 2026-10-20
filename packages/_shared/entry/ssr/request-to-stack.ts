import type { RouteStack } from "@wren-js/core/runtime/router";
import type { RedirectStatus, RouteProxyContext } from "@wren-js/core/types";
import type { RequestInput } from "virtual:wrenjs-fetch";
import { ENTRY_KIND_API, ENTRY_KIND_NOT_FOUND, ENTRY_KIND_PAGE } from "@wren-js/core/constants";
import { matchRouteToStack } from "@wren-js/core/runtime/router";
import { FLIGHT_HANDLER, FLIGHT_MIME_TYPE, FLIGHT_URL_POSTFIX } from "../../constants.ts";
import { extractPathname } from "../../utils.ts";
import { getRequest } from "./helpers.ts";
import { WrenResponse } from "./response.ts";

export type RequestToStackHandler<TRouteStack extends RouteStack> = (
  request: RequestInput,
  routeStack: TRouteStack,
  isFlight?: boolean,
) => Promise<Response>;
export interface RequestToStackMap<TRouteStack extends RouteStack> {
  [ENTRY_KIND_API]: RequestToStackHandler<TRouteStack>;
  [ENTRY_KIND_NOT_FOUND]: RequestToStackHandler<TRouteStack>;
  [ENTRY_KIND_PAGE]: RequestToStackHandler<TRouteStack>;
  [FLIGHT_HANDLER]?: RequestToStackHandler<TRouteStack>;
}

const REDIRECT_STATUSES: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);

const toPagePath = (path: string) =>
  path.endsWith(FLIGHT_URL_POSTFIX) ? path.slice(0, -FLIGHT_URL_POSTFIX.length) || "/" : path;

class ProxyContext implements RouteProxyContext {
  readonly params: Record<string, string>;

  get request(): Request {
    return getRequest(this.#input);
  }

  get url(): URL {
    if (this.#url) return this.#url;
    const { headers, url } = this.#input;
    this.#url = new URL(url, `http://${headers.get("host") ?? "localhost"}`);
    if (this.#isFlight) this.#url.pathname = toPagePath(this.#url.pathname);
    return this.#url;
  }

  readonly #input: RequestInput;
  readonly #isFlight: boolean;
  #url: undefined | URL;

  constructor(input: RequestInput, params: Record<string, string>, isFlight: boolean) {
    this.#input = input;
    this.#isFlight = isFlight;
    this.params = params;
  }

  redirect(location: string | URL, status: RedirectStatus = 302): Response {
    if (!REDIRECT_STATUSES.has(status)) {
      throw new RangeError(`[wrenjs] Invalid redirect status: ${status}.`);
    }
    return new WrenResponse(null, { headers: { Location: String(location) }, status });
  }
}

export const runProxies = <TRouteStack extends RouteStack>(
  request: RequestInput,
  routeStack: TRouteStack,
  handler: RequestToStackHandler<TRouteStack>,
  isFlight = false,
): Promise<Response> => {
  const { params, proxies = [] } = routeStack;
  const context = new ProxyContext(request, params, isFlight);
  const dispatch = async (i: number): Promise<Response> => {
    let pending: Promise<Response> | undefined;
    const next = () => {
      if (pending) throw new Error("[wrenjs] next() was called more than once by a proxy.");
      pending = i ? dispatch(i - 1) : handler(request, routeStack, isFlight);
      return pending;
    };
    const result: unknown = await proxies[i].default(context, next);
    if (result === undefined) return pending ?? next();
    if (result instanceof Response) return result;
    throw new TypeError("[wrenjs] A proxy must return a Response or nothing.");
  };
  return proxies.length ? dispatch(proxies.length - 1) : handler(request, routeStack, isFlight);
};

export const createFetch =
  <TRouteStack extends RouteStack>(handlers: RequestToStackMap<TRouteStack>) =>
  (request: RequestInput): Promise<Response> => {
    const isFlight = request.headers.get("accept") === FLIGHT_MIME_TYPE;

    let pathname = extractPathname(request.url) ?? "/";
    if (isFlight) pathname = toPagePath(pathname);
    const dispatch = (matchedEntry: TRouteStack | undefined) => {
      if (!matchedEntry) return Promise.resolve(new WrenResponse(null, { status: 404 }));
      const handler =
        (isFlight && request.method !== "GET" && handlers[FLIGHT_HANDLER]) ||
        handlers[matchedEntry.kind];
      return matchedEntry.proxies?.length
        ? runProxies(request, matchedEntry, handler, isFlight)
        : handler(request, matchedEntry, isFlight);
    };
    const matched = matchRouteToStack<TRouteStack>(pathname);
    return matched instanceof Promise ? matched.then(dispatch) : dispatch(matched);
  };
