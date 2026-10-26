import type { RequestInput } from "virtual:wrenjs-fetch";
import {
  decodeReply,
  loadServerAction,
  renderToReadableStream,
} from "@vitejs/plugin-rsc/rsc/server";
import { ENTRY_KIND_API, ENTRY_KIND_NOT_FOUND, ENTRY_KIND_PAGE } from "@wren-js/core/constants";
import { createElement, Fragment, type ReactNode } from "react";
import { jsx } from "react/jsx-runtime";
import type { ReactRouteStack } from "#/types.ts";
import type { RequestToStackMap } from "#shared/entry/ssr/request-to-stack.ts";
import {
  CONTENT_TYPE,
  EXPORT_REQUIRES_CLIENT,
  FLIGHT_HANDLER,
  FLIGHT_SERVER_ACTION_HEADER,
  HEADERS_ACTION,
  RESPONSE_DIGEST,
} from "#shared/constants.ts";
import {
  collectPageScripts,
  getRequest,
  handlerApi,
  isTrustedOrigin,
  renderPageScripts,
} from "#shared/entry/ssr/helpers.ts";
import {
  composeTree,
  loadRouteHead,
  pageHeaders,
  pageStatus,
  preparePage,
} from "#shared/entry/ssr/page.ts";
import { WrenResponse } from "#shared/entry/ssr/response.ts";
import { isResponseDigest } from "#shared/utils.ts";

export const needsHydration = ({ layouts, module }: ReactRouteStack): boolean =>
  module[EXPORT_REQUIRES_CLIENT] !== false ||
  !!layouts?.some((layout) => layout[EXPORT_REQUIRES_CLIENT] !== false);

type HtmlOptions = Parameters<SsrEntry["renderToHtml"]>[1] & { hydrate: boolean };
type SsrEntry = typeof import("../ssr/index.tsx");

let ssrEntry: Promise<SsrEntry> | undefined;
const loadSsrEntry = () => import.meta.viteRsc.loadModule<SsrEntry>("ssr", "index");

export const getSsrEntry = (): Promise<SsrEntry> => {
  if (import.meta.env.DEV) return loadSsrEntry();
  ssrEntry ??= loadSsrEntry();
  return ssrEntry;
};

const routeHtmlCache = new WeakMap<object, Pick<HtmlOptions, "hydrate" | "scripts">>();

export const htmlOptions = (
  matchedEntry: ReactRouteStack,
  onError?: HtmlOptions["onError"],
): HtmlOptions => {
  if (import.meta.env.DEV) {
    const modules = [matchedEntry.module, ...(matchedEntry.layouts ?? [])];
    return {
      hydrate: needsHydration(matchedEntry),
      onError,
      scripts: () => renderPageScripts(modules),
    };
  }
  let route = routeHtmlCache.get(matchedEntry.module);
  if (!route) {
    const scripts = collectPageScripts([matchedEntry.module, ...(matchedEntry.layouts ?? [])]);
    if (!Array.isArray(scripts))
      throw new TypeError("[wrenjs] Page scripts must be static in builds.");
    route = { hydrate: needsHydration(matchedEntry), scripts };
    routeHtmlCache.set(matchedEntry.module, route);
  }
  return { ...route, onError };
};

export const renderFlight = (
  request: RequestInput,
  matchedEntry: ReactRouteStack,
  options?: Parameters<typeof renderToReadableStream>[1],
) => {
  const page = preparePage(request, matchedEntry);
  const tree = composeTree<ReactRouteStack, ReactNode>(request, page, jsx);
  const head = loadRouteHead(request, page);
  return renderToReadableStream(
    head === undefined ? tree : createElement(Fragment, null, tree, head),
    options,
  );
};

const handlerPage = async (
  request: RequestInput,
  matchedEntry: ReactRouteStack,
  isFlight: boolean = false,
): Promise<Response> => {
  let thrown: Response | undefined;
  let streaming = false;
  const onError = (error: unknown) => {
    if (error instanceof Response) {
      if (streaming) console.warn("[wrenjs] Ignored a Response thrown after streaming began.");
      thrown ??= error;
      return RESPONSE_DIGEST;
    }
    if (!isResponseDigest(error)) console.error(error);
    return undefined;
  };
  const stream = renderFlight(request, matchedEntry, { onError });
  const status = pageStatus(matchedEntry);
  const headers = pageHeaders(matchedEntry, isFlight);
  if (isFlight) return new WrenResponse(stream, { headers, status });
  const ssr = await getSsrEntry();
  const html = await ssr.renderToHtml(stream, htmlOptions(matchedEntry, onError));
  if (thrown) {
    void html.cancel();
    return thrown;
  }
  streaming = true;
  return new WrenResponse(html, { headers, status });
};

const textResponse = (body: string, status: number) => new WrenResponse(body, { status });

export const handlerFlight = async (request: RequestInput): Promise<Response> => {
  const actionId = request.headers.get(FLIGHT_SERVER_ACTION_HEADER);
  if (request.method !== "POST" || !actionId) return textResponse("Method Not Allowed", 405);
  if (!isTrustedOrigin(request)) return textResponse("Forbidden", 403);

  let decoded: [unknown, unknown];
  try {
    const actionPromise = loadServerAction(actionId);
    void actionPromise.catch(() => {});
    const body = getRequest(request);
    const isMultipart = request.headers.get(CONTENT_TYPE)?.startsWith("multipart/form-data");
    decoded = await Promise.all([
      actionPromise,
      decodeReply(isMultipart ? await body.formData() : await body.text()),
    ]);
  } catch {
    return textResponse("Bad Request", 400);
  }

  const [action, args] = decoded;
  if (typeof action !== "function" || !Array.isArray(args)) {
    return textResponse("Bad Request", 400);
  }

  try {
    return new WrenResponse(renderToReadableStream(await action(...(args as unknown[]))), {
      headers: HEADERS_ACTION,
    });
  } catch {
    return textResponse("Internal Server Error", 500);
  }
};

export const HANDLERS = {
  [ENTRY_KIND_API]: handlerApi,
  [ENTRY_KIND_NOT_FOUND]: handlerPage,
  [ENTRY_KIND_PAGE]: handlerPage,
  [FLIGHT_HANDLER]: handlerFlight,
} satisfies RequestToStackMap<ReactRouteStack>;
