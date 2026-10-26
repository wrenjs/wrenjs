import type { WrenIntegration } from "@wren-js/core/config";
import reactPlugin from "@vitejs/plugin-react";
import rscPlugin from "@vitejs/plugin-rsc";
import { resolve } from "node:path";
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

const entry = (name: string) => resolve(import.meta.dirname, "entry", `${name}.mjs`);

const wrenIntegrationReact = (options: WrenIntegrationReactOptions = {}): WrenIntegration => {
  const clientEntry = entry("client");
  const rscEntry = entry("rsc");
  const ssrEntry = entry("ssr");

  return {
    name: PACKAGE_NAME,
    prerender: { entry: entry("prerender"), environment: "rsc" },
    server: { entry: rscEntry, environment: "rsc" },
    viteConfig: (_config, env) => ({
      environments: {
        client: clientEnvironment(clientEntry),
        rsc: serverEnvironment(env, rscEntry, "dist/ssr"),
        ssr: {
          ...serverEnvironment(env, ssrEntry, "dist/react"),
          // Pre-bundled up front so dev doesn't discover it late and re-optimize.
          optimizeDeps: { include: ["react-dom/server"] },
        },
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
