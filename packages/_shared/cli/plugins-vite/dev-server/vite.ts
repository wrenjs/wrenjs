import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { pipeline } from "node:stream/promises";
import { isCSSRequest, isRunnableDevEnvironment } from "vite";
import { PACKAGE_NAME } from "#/constants.ts";

type SsrEntryModule = Pick<typeof import("virtual:wrenjs-fetch"), "fetch">;

const toRequest = (req: IncomingMessage): Request => {
  const method = req.method ?? "GET";
  const headers: [string, string][] = [];
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    headers.push([req.rawHeaders[i], req.rawHeaders[i + 1]]);
  }

  const init: RequestInit & { duplex?: "half" } = { headers, method, signal: req.signal };
  if (method !== "GET" && method !== "HEAD") {
    // Node accepts async-iterable bodies, but DOM BodyInit typings do not.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    init.body = req as unknown as BodyInit;
    init.duplex = "half";
  }
  return new Request(`http://${req.headers.host ?? "localhost"}${req.url ?? "/"}`, init);
};

const sendResponse = async (res: ServerResponse, response: Response): Promise<void> => {
  res.writeHead(response.status, [...response.headers].flat());
  if (!response.body) {
    res.end();
    return;
  }
  await pipeline(response.body, res);
};

/**
 * Dev-only: route every request Vite's own middlewares did not claim (modules,
 * assets, HMR) to the `fetch` handler running inside the `ssr` environment.
 */
export const pluginWrenDevServer = (entry: string): Plugin => ({
  apply: "serve",
  configureServer(server) {
    const environment = server.environments.ssr;
    if (!isRunnableDevEnvironment(environment)) {
      throw new Error(`[${PACKAGE_NAME}] The "ssr" environment must be runnable in dev.`);
    }

    // Returning a function registers the middleware after Vite's internal ones.
    return () => {
      server.middlewares.use((req, res, next) => {
        req.url = req.originalUrl ?? req.url;
        environment.runner
          .import<SsrEntryModule>(entry)
          .then(async ({ fetch }) => sendResponse(res, await fetch(toRequest(req))))
          // oxlint-disable-next-line promise/no-callback-in-promise -- Connect expects errors via next().
          .catch(next);
      });
    };
  },
  hotUpdate({ file, modules, server }) {
    if (this.environment.name !== "ssr" || isCSSRequest(file) || modules.length === 0) return;
    if (server.environments.client.moduleGraph.getModulesByFile(file)?.size) return;
    server.environments.client.hot.send({ triggeredBy: file, type: "full-reload" });
  },
  name: `${PACKAGE_NAME}:dev-server`,
});
