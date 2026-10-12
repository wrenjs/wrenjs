import type { WrenIntegration } from "wrenjs/config";
import { fileURLToPath } from "node:url";
import { pluginWrenCss } from "#shared/cli/plugins-vite/css/vite.ts";
import { pluginWrenDevServer } from "#shared/cli/plugins-vite/dev-server/vite.ts";
import { pluginWrenLink } from "#shared/cli/plugins-vite/link/vite.ts";
import { PACKAGE_NAME } from "../../constants.ts";

export interface WrenIntegrationSSXOptions {
  compiler?: boolean;
}
const wrenIntegrationSSX = (_options: WrenIntegrationSSXOptions = {}): WrenIntegration => {
  const ssrEntry = fileURLToPath(new URL("./entry/ssr.mjs", import.meta.url));
  const prerenderEntry = fileURLToPath(new URL("./entry/prerender.mjs", import.meta.url));
  const clientEntry = fileURLToPath(new URL("./entry/client.mjs", import.meta.url));

  return {
    name: PACKAGE_NAME,
    prerender: { entry: prerenderEntry, environment: "ssr" },
    viteConfig(config, env) {
      return {
        environments: {
          client: {
            build: {
              outDir: "dist/client",
              rolldownOptions: {
                input: { index: clientEntry },
              },
            },
            consumer: "client",
          },
          // Built before `client` (core orders server consumers first); its
          // emitted assets are re-emitted by the client build.
          ssr: {
            build: {
              // Emit route stylesheets (dropped by default for server consumers).
              emitAssets: true,
              outDir: "dist/ssr",
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
        // SSX ships no `jsx-dev-runtime`; keep the production JSX transform in dev.
        oxc: { jsx: { development: false } },
        plugins: [
          pluginWrenLink({ clientEntry, kind: "document" }),
          pluginWrenDevServer(ssrEntry),
          ...pluginWrenCss(config.router ?? "src/pages"),
        ],
      };
    },
  };
};

export default wrenIntegrationSSX;
