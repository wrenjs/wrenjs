import type { ReactNode } from "react";
import type { ReactFormState } from "react-dom/client";
import {
  createFromFetch,
  createFromReadableStream,
  createTemporaryReferenceSet,
  encodeReply,
  setServerCallback,
} from "@vitejs/plugin-rsc/browser";
import { startTransition, StrictMode, useLayoutEffect, useState } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { LINK_INVALIDATE_EVENT, WINDOW_KEY_HYDRATE } from "#shared/constants.ts";
import { createFlightRequest } from "#shared/entry/client/request.ts";
import { rscStream } from "./rsc-html-stream.ts";

declare global {
  interface Window {
    [WINDOW_KEY_HYDRATE]?: "hydrate" | "render";
  }
}

type FlightPayload =
  | (Awaited<ReactNode> & { formState?: null | ReactFormState })
  | null
  | undefined;
interface RenderState {
  onCommit?: () => void;
  payload: FlightPayload;
}

let mounted: PromiseWithResolvers<void> | undefined;
let hydration: Promise<void> | undefined;
let setPayload: ((state: RenderState) => void) | undefined;
let failRender: ((error: unknown) => void) | undefined;
let refresh: AbortController | undefined;

const activateLinks = () => {
  if (customElements.get("wren-link")) return undefined;
  const check = () => {
    if (!document.querySelector("wren-link")) return;
    observer.disconnect();
    import("@wren-js/core/components/Link/wren-link").catch((error: unknown) => {
      console.error("[wrenjs] Unable to activate Link.", error);
    });
  };
  const observer = new MutationObserver(check);
  observer.observe(document, { childList: true, subtree: true });
  check();
  return () => observer.disconnect();
};

function BrowserRoot({ initial }: { initial: RenderState }) {
  const [state, setState] = useState(initial);
  useLayoutEffect(() => {
    setPayload = (next) => startTransition(() => setState(next));
    mounted?.resolve();
  }, []);
  useLayoutEffect(() => state.onCommit?.(), [state]);
  useLayoutEffect(activateLinks, []);
  return state.payload;
}

const onUncaughtError = (error: unknown) => {
  console.error("[wrenjs/react] Unable to render the page.", error);
  mounted?.reject(error);
  failRender?.(error);
};

const mount = (initial: RenderState, attach: boolean): Promise<void> => {
  mounted = Promise.withResolvers();
  const element = (
    <StrictMode>
      <BrowserRoot initial={initial} />
    </StrictMode>
  );
  if (attach) {
    hydrateRoot(document, element, { formState: initial.payload?.formState, onUncaughtError });
  } else {
    createRoot(document, { onUncaughtError }).render(element);
  }
  return mounted.promise;
};

export function hydrate(): Promise<void> {
  hydration ??= createFromReadableStream<FlightPayload>(rscStream).then((payload) =>
    mount({ payload }, window[WINDOW_KEY_HYDRATE] !== "render"),
  );
  return hydration;
}

if (window[WINDOW_KEY_HYDRATE]) void hydrate();

export async function renderNavigation(response: Response, signal: AbortSignal): Promise<void> {
  refresh?.abort();
  await renderResponse(response, signal);
}

async function renderResponse(response: Response, signal: AbortSignal): Promise<void> {
  const payload = await createFromFetch<FlightPayload>(Promise.resolve(response));
  await hydration;
  signal.throwIfAborted();

  const committed = Promise.withResolvers<void>();
  const onAbort = () => committed.reject(signal.reason);
  signal.addEventListener("abort", onAbort, { once: true });
  failRender = committed.reject;
  try {
    const next = { onCommit: committed.resolve, payload };
    if (!mounted) {
      await Promise.all([mount(next, false), committed.promise]);
      return;
    }
    await mounted.promise;
    signal.throwIfAborted();
    if (!setPayload) throw new Error("React's browser root is not ready.");
    setPayload(next);
    await committed.promise;
  } finally {
    signal.removeEventListener("abort", onAbort);
    if (failRender === committed.reject) failRender = undefined;
  }
}

setServerCallback(async (id, args) => {
  try {
    const temporaryReferences = createTemporaryReferenceSet();
    const request = createFlightRequest(window.location.href, {
      body: await encodeReply(args, { temporaryReferences }),
      id,
    });
    return await createFromFetch(fetch(request), { temporaryReferences });
  } finally {
    window.dispatchEvent(new Event(LINK_INVALIDATE_EVENT));
  }
});

if (import.meta.hot) {
  import.meta.hot.on("rsc:update", () => {
    window.dispatchEvent(new Event(LINK_INVALIDATE_EVENT));
    refresh?.abort();
    const controller = new AbortController();
    refresh = controller;
    void fetch(createFlightRequest(window.location.href), { signal: controller.signal })
      .then((response) => renderResponse(response, controller.signal))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("[wrenjs/react] Unable to refresh the page.", error);
      });
  });
}
