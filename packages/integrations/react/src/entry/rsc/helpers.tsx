import type { RequestInput } from "virtual:wrenjs-fetch";
import {
  decodeReply,
  loadServerAction,
  renderToReadableStream,
} from "@vitejs/plugin-rsc/rsc/server";
import { type ReactNode } from "react";
import { ENTRY_KIND_API, ENTRY_KIND_NOT_FOUND, ENTRY_KIND_PAGE } from "wrenjs/constants";
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
} from "#shared/entry/ssr/helpers.ts";
import type { ReactRouteStack } from "#/types.ts";
import { responseText } from "#/entry/utils/reponse.ts";

/** Missing metadata (dev, unclassified) hydrates; only a proven server-only stack opts out. */
export const needsHydration = ({ layouts, module }: ReactRouteStack): boolean =>
  module[EXPORT_REQUIRES_CLIENT] !== false ||
  !!layouts?.some((layout) => layout[EXPORT_REQUIRES_CLIENT] !== false);

type HtmlOptions = Parameters<SsrEntry["renderToHtml"]>[1] & { hydrate: boolean };
type SsrEntry = typeof import("../ssr/index.tsx");

let ssrEntry: Promise<SsrEntry> | undefined;
const loadSsrEntry = () => import.meta.viteRsc.loadModule<SsrEntry>("ssr", "index");
/** The SSR bundle is static in builds, so it loads once; dev reloads it per request for HMR. */
export const getSsrEntry = (): Promise<SsrEntry> => {
  if (import.meta.env.DEV) return loadSsrEntry();
  ssrEntry ??= loadSsrEntry();
  return ssrEntry;
};

/**
 * `renderToHtml` options for a route stack. Builds know every script up front; dev resolves
 * them lazily, once SSR has loaded the client components that may declare some.
 */
export const htmlOptions = (matchedEntry: ReactRouteStack): HtmlOptions => {
  const modules = [matchedEntry.module, ...(matchedEntry.layouts ?? [])];
  const hydrate = needsHydration(matchedEntry);
  if (import.meta.env.DEV) return { hydrate, scripts: () => renderPageScripts(modules) };
  const scripts = collectPageScripts(modules);
  // Stamped exports are synchronous in builds; a promise here means a misconfigured build.
  if (!Array.isArray(scripts))
    throw new TypeError("[wrenjs] Page scripts must be static in builds.");
  return { hydrate, scripts };
};

export const renderFlight = async (
  request: RequestInput,
  matchedEntry: ReactRouteStack,
  options?: Parameters<typeof renderToReadableStream>[1],
) => {
  const { layouts = [], module, proxies = [] } = matchedEntry;

  if (proxies.length > 0) await executeProxies(request, proxies);

  const data = Promise.all([
    module.loader?.({ params: matchedEntry.params, request: getRequest(request) }),
    ...layouts.map(({ loader }) =>
      loader?.({ params: matchedEntry.params, request: getRequest(request) }),
    ),
  ]);

  const Page = module.default;
  const Wrapped = layouts.reduce(
    (children: ReactNode, { default: Layout }) => <Layout data={data}>{children}</Layout>,
    <Page data={data} params={matchedEntry.params} />,
  );
  return renderToReadableStream(Wrapped, options);
};

const handlerPage = async (
  request: RequestInput,
  matchedEntry: ReactRouteStack,
  isRsc: boolean = false,
): Promise<Response> => {
  const renderedStream = await renderFlight(request, matchedEntry);
  if (isRsc) {
    return new Response(renderedStream, {
      headers: HEADERS_FLIGHT,
      status: 200,
    });
  }
  const ssr = await getSsrEntry();
  const ssrResult = await ssr.renderToHtml(renderedStream, htmlOptions(matchedEntry));
  return new Response(ssrResult.stream, {
    headers: HEADERS_HTML_RESPONSE,
    status: ssrResult.status,
  });
};

export const handlerFlight = async (
  request: RequestInput,
  matchedEntry: ReactRouteStack,
): Promise<Response> => {
  const bodyDecoder = new TextDecoder();

  if (request.method !== "POST") {
    return responseText("Method Not Allowed", 405);
  }

  const actionId = request.headers?.get(FLIGHT_SERVER_ACTION_HEADER);
  if (!actionId) {
    return responseText("Method Not Allowed", 405);
  }

  if (!isTrustedOrigin(request)) {
    return responseText("Forbidden", 403);
  }

  await executeProxies(request, matchedEntry.proxies);

  let decoded: [unknown, unknown];
  try {
    const actionPromise = loadServerAction(actionId);
    void actionPromise.catch(() => {});

    const bodyArrayBuffer = await getRequest(request).arrayBuffer();
    if (!bodyArrayBuffer) {
      return responseText("Bad Request", 400);
    }
    const bodyBytes = new Uint8Array(bodyArrayBuffer);

    const contentType = request.headers?.get(CONTENT_TYPE);
    decoded = await Promise.all([
      actionPromise,
      contentType?.startsWith("multipart/form-data")
        ? new Response(bodyBytes, { headers: { [CONTENT_TYPE]: contentType } })
            .formData()
            .then(decodeReply)
        : decodeReply(bodyDecoder.decode(bodyBytes)),
    ]);
  } catch {
    return responseText("Bad Request", 400);
  }

  const [action, args] = decoded;
  if (typeof action !== "function" || !Array.isArray(args)) {
    return responseText("Bad Request", 400);
  }

  try {
    return new Response(renderToReadableStream(await action(...(args as unknown[]))), {
      headers: HEADERS_ACTION,
    });
  } catch {
    return responseText("Internal Server Error", 500);
  }
};

export const HANDLERS = {
  [ENTRY_KIND_API]: handlerApi,
  [ENTRY_KIND_NOT_FOUND]: handlerPage,
  [ENTRY_KIND_PAGE]: handlerPage,
  [FLIGHT_HANDLER]: handlerFlight,
};
