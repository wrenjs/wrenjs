import type { RequestInput } from "virtual:wrenjs-fetch";
import {
  decodeReply,
  loadServerAction,
  renderToReadableStream,
} from "@vitejs/plugin-rsc/rsc/server";
import { ENTRY_KIND_API, ENTRY_KIND_NOT_FOUND, ENTRY_KIND_PAGE } from "@wren-js/core/constants";
import { type ReactNode } from "react";
import { jsx } from "react/jsx-runtime";
import type { ReactRouteStack } from "#/types.ts";
import type { RequestToStackMap } from "#shared/entry/ssr/request-to-stack.ts";
import {
  CONTENT_TYPE,
  EXPORT_REQUIRES_CLIENT,
  FLIGHT_HANDLER,
  FLIGHT_SERVER_ACTION_HEADER,
  HEADERS_ACTION,
  HEADERS_FLIGHT,
  HEADERS_HTML_RESPONSE,
} from "#shared/constants.ts";
import {
  collectPageScripts,
  executeProxies,
  getRequest,
  handlerApi,
  isTrustedOrigin,
  renderPageScripts,
  withRequest,
} from "#shared/entry/ssr/helpers.ts";
import { pageStatus, preparePage } from "#shared/entry/ssr/page.ts";
import { WrenResponse } from "#shared/entry/ssr/response.ts";

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

export const htmlOptions = (matchedEntry: ReactRouteStack): HtmlOptions => {
  const modules = [matchedEntry.module, ...(matchedEntry.layouts ?? [])];
  const hydrate = needsHydration(matchedEntry);
  if (import.meta.env.DEV) return { hydrate, scripts: () => renderPageScripts(modules) };
  const scripts = collectPageScripts(modules);

  if (!Array.isArray(scripts))
    throw new TypeError("[wrenjs] Page scripts must be static in builds.");
  return { hydrate, scripts };
};

export const renderFlight = async (
  request: RequestInput,
  matchedEntry: ReactRouteStack,
  options?: Parameters<typeof renderToReadableStream>[1],
) => {
  const { data, layouts, module, params } = await preparePage(request, matchedEntry);
  return renderToReadableStream(
    layouts.reduce(
      (children: ReactNode, { default: Layout }) =>
        jsx(Layout, withRequest(request, { children, data })),
      jsx(module.default, withRequest(request, { data, params })),
    ),
    options,
  );
};

const handlerPage = async (
  request: RequestInput,
  matchedEntry: ReactRouteStack,
  isFlight: boolean = false,
): Promise<Response> => {
  const stream = await renderFlight(request, matchedEntry);
  const status = pageStatus(matchedEntry);
  if (isFlight) return new WrenResponse(stream, { headers: HEADERS_FLIGHT, status });
  const ssr = await getSsrEntry();
  return new WrenResponse(await ssr.renderToHtml(stream, htmlOptions(matchedEntry)), {
    headers: HEADERS_HTML_RESPONSE,
    status,
  });
};

const textResponse = (body: string, status: number) => new WrenResponse(body, { status });

export const handlerFlight = async (
  request: RequestInput,
  matchedEntry: ReactRouteStack,
): Promise<Response> => {
  const actionId = request.headers?.get(FLIGHT_SERVER_ACTION_HEADER);
  if (request.method !== "POST" || !actionId) return textResponse("Method Not Allowed", 405);
  if (!isTrustedOrigin(request)) return textResponse("Forbidden", 403);

  await executeProxies(request, matchedEntry.proxies);

  let decoded: [unknown, unknown];
  try {
    const actionPromise = loadServerAction(actionId);
    void actionPromise.catch(() => {});
    const body = getRequest(request);
    const isMultipart = request.headers?.get(CONTENT_TYPE)?.startsWith("multipart/form-data");
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
