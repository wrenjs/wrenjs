import type { WrenIntegration } from "@wren-js/core/config";
import reactPlugin from "@vitejs/plugin-react";
import rscPlugin from "@vitejs/plugin-rsc";
import { fileURLToPath } from "node:url";
import { clientEnvironment, serverEnvironment } from "#shared/cli/environments.ts";
import { pluginWrenLink } from "#shared/cli/plugins-vite/link/vite.ts";
import { PACKAGE_NAME } from "../../constants.ts";
import { pluginWrenBridgeRSC } from "./plugins-vite/bridge-rsc/vite.ts";
import { pluginWrenFlightFormData } from "./plugins-vite/flight-form-data/vite.ts";
import { pluginWrenRemoveLegacyReact } from "./plugins-vite/remove-legacy-react/vite.ts";
import { pluginWrenServerOnlyRoutes } from "./plugins-vite/server-only-routes/vite.ts";

export interface WrenIntegrationReactOptions {
  compiler?: boolean;
}
const wrenIntegrationReact = (options: WrenIntegrationReactOptions = {}): WrenIntegration => {
  const clientEntry = fileURLToPath(new URL("./entry/client.mjs", import.meta.url));
  const rscEntry = fileURLToPath(new URL("./entry/rsc.mjs", import.meta.url));
  const ssrEntry = fileURLToPath(new URL("./entry/ssr.mjs", import.meta.url));
  const prerenderEntry = fileURLToPath(new URL("./entry/prerender.mjs", import.meta.url));

  return {
    name: PACKAGE_NAME,
    prerender: { entry: prerenderEntry, environment: "rsc" },
    viteConfig: (_config, env) => ({
      environments: {
        client: clientEnvironment(clientEntry),
        rsc: serverEnvironment(env, rscEntry, "dist/ssr"),
        ssr: serverEnvironment(env, ssrEntry, "dist/react"),
      },
      plugins: [
        pluginWrenLink({ clientEntry, kind: "flight" }),
        reactPlugin(options.compiler ? { compiler: true } : undefined),
        rscPlugin({ entries: { client: clientEntry, rsc: rscEntry, ssr: ssrEntry } }),
        pluginWrenBridgeRSC(),
        pluginWrenFlightFormData(),
        pluginWrenRemoveLegacyReact(),
        pluginWrenServerOnlyRoutes(),
      ],
    }),
  };
};

export default wrenIntegrationReact;
