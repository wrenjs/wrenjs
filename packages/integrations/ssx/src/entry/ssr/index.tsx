import type { RequestInput } from "virtual:wrenjs-fetch";
import { requestToStack } from "#shared/entry/ssr/request-to-stack.ts";
import type { SSXRouteStack } from "#/types.ts";
import { HANDLERS } from "./helpers.tsx";

const handler = (request: RequestInput): Promise<Response> =>
  requestToStack<SSXRouteStack>(request, HANDLERS);

export const fetch = handler;
export default handler;
