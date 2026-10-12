import {
  ACCEPT,
  FLIGHT_MIME_TYPE,
  FLIGHT_SERVER_ACTION_HEADER,
  FLIGHT_URL_POSTFIX,
} from "../../constants.ts";

export function createFlightRequest(
  urlString: string,
  action?: { body: BodyInit; id: string },
): Request {
  const url = new URL(urlString);
  url.pathname += FLIGHT_URL_POSTFIX;
  url.hash = "";
  const headers = new Headers({ [ACCEPT]: FLIGHT_MIME_TYPE });
  if (action) headers.set(FLIGHT_SERVER_ACTION_HEADER, action.id);
  return new Request(url, {
    body: action?.body,
    headers,
    method: action ? "POST" : "GET",
  });
}
