import { fetch } from "virtual:wrenjs-fetch";

import { CACHE_CONTROL, WREN_RESPONSE } from "#shared/constants.ts";
import { responseParts } from "#shared/utils.ts";

const CACHE_CONTROL_DEFAULT = "private, no-store";
const CACHE_HEADERS = [
	CACHE_CONTROL,
	"CDN-Cache-Control",
	"Cloudflare-CDN-Cache-Control",
	"Expires",
];

const withCacheDefault = (response: Response): Response => {
	const { headers, status } = response;
	if (status === 304 || CACHE_HEADERS.some((name) => headers.has(name))) {
		return response;
	}
	try {
		headers.set(CACHE_CONTROL, CACHE_CONTROL_DEFAULT);
		return response;
	} catch {
		const copy = new Response(response.body, response);
		copy.headers.set(CACHE_CONTROL, CACHE_CONTROL_DEFAULT);
		return copy;
	}
};

const handler = {
	async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext): Promise<Response> {
		const response = await fetch(request, { cloudflare: { ctx, env } });
		if (!(WREN_RESPONSE in response)) {
			return withCacheDefault(response);
		}
		const { body, headers, status } = responseParts(response) ?? response;
		return withCacheDefault(new Response(body, { headers, status }));
	},
};
export default handler;
