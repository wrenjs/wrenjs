import type { Plugin } from "vite";
import { isCSSRequest, isRunnableDevEnvironment } from "vite";
import { isRequestAbortError, toRequestInput } from "../../../entry/node/request.ts";
import { sendResponse } from "../../../entry/node/response.ts";

type SsrEntryModule = Pick<typeof import("virtual:wrenjs-fetch"), "fetch">;

export const pluginWrenDevServer = (entry: string): Plugin => ({
  apply: "serve",
  configureServer(server) {
    const environment = server.environments.ssr;
    if (!isRunnableDevEnvironment(environment)) return undefined;

    return () => {
      server.middlewares.use((req, res, next) => {
        environment.runner
          .import<SsrEntryModule>(entry)
          .then(async ({ fetch }) =>
            sendResponse(res, await fetch(toRequestInput(req, req.originalUrl ?? req.url))),
          )
          .catch((error: unknown) => {
            // oxlint-disable-next-line promise/no-callback-in-promise -- Connect expects errors via next().
            if (!isRequestAbortError(req, error)) next(error);
          });
      });
    };
  },
  hotUpdate({ file, modules, server }) {
    if (this.environment.name !== "ssr" || isCSSRequest(file) || modules.length === 0) return;
    if (server.environments.client.moduleGraph.getModulesByFile(file)?.size) return;
    server.environments.client.hot.send({ triggeredBy: file, type: "full-reload" });
  },
  name: "wrenjs-dev-server",
});
