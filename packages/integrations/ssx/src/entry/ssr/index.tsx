import { createFetch } from "#shared/entry/ssr/request-to-stack.ts";
import { HANDLERS } from "./helpers.tsx";

export const fetch = createFetch(HANDLERS);
export default fetch;
