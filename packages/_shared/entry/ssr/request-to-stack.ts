import type { RequestInput } from "virtual:wrenjs-fetch";
import type { RouteStack } from "wrenjs/runtime/router";
import { ENTRY_KIND_API, ENTRY_KIND_NOT_FOUND, ENTRY_KIND_PAGE } from "wrenjs/constants";
import { matchRouteToStack } from "wrenjs/runtime/router";
import { FLIGHT_HANDLER, FLIGHT_MIME_TYPE, FLIGHT_URL_POSTFIX } from "../../constants.ts";
import { extractPathname } from "../../utils.ts";

export type RequestToStackHandler<TRouteStack extends null | RouteStack> = (
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

export const requestToStack = <TRouteStack extends RouteStack>(
  request: RequestInput,
  handlers: RequestToStackMap<TRouteStack>,
): Promise<Response> => {
  const isFlight = request.headers?.get("accept") === FLIGHT_MIME_TYPE;

  let pathname = extractPathname(request.url) ?? "/";
  if (isFlight && pathname.endsWith(FLIGHT_URL_POSTFIX)) {
    pathname = pathname.slice(0, -FLIGHT_URL_POSTFIX.length) || "/";
  }
  const dispatch = (matchedEntry: TRouteStack | undefined) => {
    if (!matchedEntry) return Promise.resolve(new Response(null, { status: 404 }));
    const flightHandler = handlers[FLIGHT_HANDLER];
    // Server actions are matched first so the route's proxies guard them like any other request.
    if (isFlight && request.method !== "GET" && flightHandler) {
      return flightHandler(request, matchedEntry, isFlight);
    }
    return handlers[matchedEntry.kind](request, matchedEntry, isFlight);
  };
  const matched = matchRouteToStack<TRouteStack>(pathname);
  return matched instanceof Promise ? matched.then(dispatch) : dispatch(matched);
};
