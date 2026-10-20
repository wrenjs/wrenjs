import { fetch } from "virtual:wrenjs-fetch";
import { WREN_RESPONSE } from "#shared/constants.ts";
import { responseParts } from "#shared/utils.ts";

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext): Promise<Response> {
    const response = await fetch(request, { cloudflare: { ctx, env } });
    if (!(WREN_RESPONSE in response)) return response;
    const { body, headers, status } = responseParts(response) ?? response;
    return new Response(body, { headers, status });
  },
};
