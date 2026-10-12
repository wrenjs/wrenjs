import type { WrenIntegration } from "wrenjs/config";
import reactPlugin from "@vitejs/plugin-react";
import rscPlugin from "@vitejs/plugin-rsc";
import { fileURLToPath } from "node:url";
import { pluginWrenLink } from "#shared/cli/plugins-vite/link/vite.ts";
import { pluginWrenBridgeRSC } from "./plugins-vite/bridge-rsc/vite.ts";
import { pluginWrenRemoveLegacyReact } from "./plugins-vite/remove-legacy-react/vite.ts";
import { pluginWrenServerOnlyRoutes } from "./plugins-vite/server-only-routes/vite.ts";

export interface WrenIntegrationReactOptions {
  compiler?: boolean;
}
const wrenIntegrationReact = (options: WrenIntegrationReactOptions = {}): WrenIntegration => {
  // Ship these compiled entries relative to this module, not the consumer's cwd.
  const clientEntry = fileURLToPath(new URL("./entry/client.mjs", import.meta.url));
  const flightEntry = fileURLToPath(new URL("./entry/ssr.mjs", import.meta.url));
  const ssrEntry = fileURLToPath(new URL("./entry/react.mjs", import.meta.url));
  const prerenderEntry = fileURLToPath(new URL("./entry/prerender.mjs", import.meta.url));

  return {
    name: "@wrenjs/react",
    prerender: { entry: prerenderEntry, environment: "rsc" },
    viteConfig(config, env) {
      return {
        environments: {
          client: {
            build: {
              rolldownOptions: {
                input: { index: clientEntry },
              },
            },
            consumer: "client",
          },
          rsc: {
            build: {
              outDir: "dist/ssr",
              reportCompressedSize: false,
              rolldownOptions: {
                input: { index: flightEntry },
              },
              ssr: true,
            },
            consumer: "server",
            define: {
              "process.env.NODE_ENV": JSON.stringify(env.mode),
            },
          },
          // The plugin-rsc `ssr` environment is the internal React HTML
          // Renderer (`renderToHtml`), loaded by the handler at runtime.
          ssr: {
            build: {
              outDir: "dist/react",
              reportCompressedSize: false,
              rolldownOptions: {
                input: { index: ssrEntry },
              },
              ssr: true,
            },
            consumer: "server",
            define: {
              "process.env.NODE_ENV": JSON.stringify(env.mode),
            },
          },
        },
        plugins: [
          pluginWrenLink({ clientEntry, kind: "flight" }),
          reactPlugin(options?.compiler ? { compiler: true } : undefined),
          rscPlugin({
            entries: {
              client: clientEntry,
              rsc: flightEntry,
              ssr: ssrEntry,
            },
          }),
          pluginWrenBridgeRSC(),
          pluginWrenRemoveLegacyReact(),
          pluginWrenServerOnlyRoutes(),
        ],
      };
    },
  };
};

export default wrenIntegrationReact;
