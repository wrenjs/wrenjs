import { HEADERS_TEXT_RESPONSE } from "#shared/constants.ts";

export const responseText = (body: string, status: number) => {
  return new Response(body, { headers: HEADERS_TEXT_RESPONSE, status });
};
