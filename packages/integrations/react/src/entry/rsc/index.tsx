import type { RequestInput } from "virtual:wrenjs-fetch";
import { requestToStack } from "#shared/entry/ssr/request-to-stack.ts";
import type { ReactRouteStack } from "#/types.ts";
import { HANDLERS } from "./helpers.tsx";

const handler = (request: RequestInput): Promise<Response> =>
  requestToStack<ReactRouteStack>(request, HANDLERS);

export const fetch = handler;
export default handler;
