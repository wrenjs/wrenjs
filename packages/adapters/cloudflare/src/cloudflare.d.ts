declare namespace Cloudflare {
  interface Env {}
}

interface ExecutionContext {
  passThroughOnException(): void;
  waitUntil(promise: Promise<unknown>): void;
}
