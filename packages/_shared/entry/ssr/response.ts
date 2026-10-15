import { HEADERS_TEXT_RESPONSE, WREN_RESPONSE } from "../../constants.ts";

export type WrenResponseBody = null | ReadableStream<Uint8Array> | string;

export interface WrenResponseInit {
  headers?: Readonly<Record<string, string>>;
  status?: number;
}

export interface WrenResponseParts {
  body: WrenResponseBody;
  headers: Readonly<Record<string, string>>;
  status: number;
}

const NO_HEADERS: Readonly<Record<string, string>> = Object.freeze({});

export class WrenResponse implements Response {
  get body(): null | ReadableStream<Uint8Array<ArrayBuffer>> {
    return this.#materialize().body;
  }

  get bodyUsed(): boolean {
    return this.#response?.bodyUsed ?? false;
  }

  get headers(): Headers {
    return this.#materialize().headers;
  }

  get ok(): boolean {
    const { status } = this;
    return status >= 200 && status < 300;
  }

  get redirected(): boolean {
    return this.#response?.redirected ?? false;
  }

  get status(): number {
    return this.#parts?.status ?? this.#materialize().status;
  }

  get statusText(): string {
    return this.#response?.statusText ?? "";
  }

  get [Symbol.toStringTag](): string {
    return "Response";
  }

  get type(): ResponseType {
    return this.#response?.type ?? "default";
  }

  get url(): string {
    return this.#response?.url ?? "";
  }

  #parts: undefined | WrenResponseParts;

  #response: Response | undefined;

  constructor(body: WrenResponseBody = null, init: WrenResponseInit = {}) {
    this.#parts = {
      body,
      headers: init.headers ?? (typeof body === "string" ? HEADERS_TEXT_RESPONSE : NO_HEADERS),
      status: init.status ?? 200,
    };
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    return this.#materialize().arrayBuffer();
  }

  blob(): Promise<Blob> {
    return this.#materialize().blob();
  }

  bytes(): Promise<Uint8Array<ArrayBuffer>> {
    return this.#materialize().bytes();
  }

  clone(): Response {
    return this.#materialize().clone();
  }

  formData(): Promise<FormData> {
    return this.#materialize().formData();
  }

  json(): Promise<unknown> {
    return this.#materialize().json();
  }

  text(): Promise<string> {
    return this.#materialize().text();
  }

  [WREN_RESPONSE](): undefined | WrenResponseParts {
    return this.#parts;
  }

  #materialize(): Response {
    if (this.#parts) {
      const { body, headers, status } = this.#parts;
      this.#parts = undefined;
      this.#response = new Response(body, { headers, status });
    }
    return this.#response!;
  }
}

const linkResponsePrototype = (): object => {
  const prototype = globalThis.Response.prototype;
  Object.setPrototypeOf(WrenResponse.prototype, prototype);
  return prototype;
};

Object.setPrototypeOf(
  WrenResponse.prototype,
  new Proxy({}, { getPrototypeOf: linkResponsePrototype }),
);
