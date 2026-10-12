import type { WrenIntegration } from "wrenjs/config";
import prefresh from "@prefresh/vite";
import { fileURLToPath } from "node:url";
import { pluginWrenCss } from "#shared/cli/plugins-vite/css/vite.ts";
import { pluginWrenDevServer } from "#shared/cli/plugins-vite/dev-server/vite.ts";
import { pluginWrenIslands } from "#shared/cli/plugins-vite/islands/vite.ts";
import { pluginWrenLink } from "#shared/cli/plugins-vite/link/vite.ts";
import { PACKAGE_NAME } from "../../constants.ts";
import { pluginWrenPreactJsx } from "./plugins-vite/preact-jsx/vite.ts";

export interface WrenIntegrationPreactOptions {
  compiler?: boolean;
}
const wrenIntegrationPreact = (_options: WrenIntegrationPreactOptions = {}): WrenIntegration => {
  const ssrEntry = fileURLToPath(new URL("./entry/ssr.mjs", import.meta.url));
  const prerenderEntry = fileURLToPath(new URL("./entry/prerender.mjs", import.meta.url));
  const clientEntry = fileURLToPath(new URL("./entry/client.mjs", import.meta.url));

  return {
    name: PACKAGE_NAME,
    prerender: { entry: prerenderEntry, environment: "ssr" },
    // @ts-expect-error -- TODO: prefresh (or more likely, our types) causes error here.
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
        plugins: [
          pluginWrenLink({ clientEntry, kind: "flight" }),
          pluginWrenIslands({
            runtimeEntry: clientEntry,
            wrapperImport: `${PACKAGE_NAME}/runtime/island`,
          }),
          pluginWrenDevServer(ssrEntry),
          ...pluginWrenCss(config.router ?? "src/pages"),
          pluginWrenPreactJsx(),
          prefresh(),
        ],
      };
    },
  } satisfies WrenIntegration;
};

export default wrenIntegrationPreact;
