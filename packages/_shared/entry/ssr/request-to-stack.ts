import type { RouteStack } from "@wren-js/core/runtime/router";
import type { RequestInput } from "virtual:wrenjs-fetch";
import { ENTRY_KIND_API, ENTRY_KIND_NOT_FOUND, ENTRY_KIND_PAGE } from "@wren-js/core/constants";
import { matchRouteToStack } from "@wren-js/core/runtime/router";
import { FLIGHT_HANDLER, FLIGHT_MIME_TYPE, FLIGHT_URL_POSTFIX } from "../../constants.ts";
import { extractPathname } from "../../utils.ts";
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

export const createFetch =
  <TRouteStack extends RouteStack>(handlers: RequestToStackMap<TRouteStack>) =>
  (request: RequestInput): Promise<Response> => {
    const isFlight = request.headers?.get("accept") === FLIGHT_MIME_TYPE;

    let pathname = extractPathname(request.url) ?? "/";
    if (isFlight && pathname.endsWith(FLIGHT_URL_POSTFIX)) {
      pathname = pathname.slice(0, -FLIGHT_URL_POSTFIX.length) || "/";
    }
    const dispatch = (matchedEntry: TRouteStack | undefined) => {
      if (!matchedEntry) return Promise.resolve(new WrenResponse(null, { status: 404 }));
      const flightHandler = handlers[FLIGHT_HANDLER];

      if (isFlight && request.method !== "GET" && flightHandler) {
        return flightHandler(request, matchedEntry, isFlight);
      }
      return handlers[matchedEntry.kind](request, matchedEntry, isFlight);
    };
    const matched = matchRouteToStack<TRouteStack>(pathname);
    return matched instanceof Promise ? matched.then(dispatch) : dispatch(matched);
  };
