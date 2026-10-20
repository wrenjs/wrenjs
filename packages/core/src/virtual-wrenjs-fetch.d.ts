declare module "virtual:wrenjs-fetch" {
  export type RequestInput =
    | Request
    | {
        headers: Pick<Headers, "get">;
        method: string;
        toRequest(): Request;
        url: string;
      };

  export const fetch: (request: RequestInput, context?: Wren.Context) => Promise<Response>;
}
