import type { WrenIntegration } from "@wren-js/core/config";
import { resolve } from "node:path";
import { clientEnvironment, serverEnvironment } from "#shared/cli/environments.ts";
import { pluginWrenCss } from "#shared/cli/plugins-vite/css/vite.ts";
import { pluginWrenDevServer } from "#shared/cli/plugins-vite/dev-server/vite.ts";
import { pluginWrenLink } from "#shared/cli/plugins-vite/link/vite.ts";
import { pluginWrenServerOnly } from "#shared/cli/plugins-vite/server-only/vite.ts";
import { PACKAGE_NAME } from "../../constants.ts";

const entry = (name: string) => resolve(import.meta.dirname, "entry", `${name}.mjs`);

const wrenIntegrationSSX = (): WrenIntegration => {
  const ssrEntry = entry("ssr");
  const clientEntry = entry("client");

  return {
    name: PACKAGE_NAME,
    prerender: { entry: entry("prerender"), environment: "ssr" },
    viteConfig: (config, env) => ({
      environments: {
        client: clientEnvironment(clientEntry, "dist/client"),
        ssr: serverEnvironment(env, ssrEntry, "dist/ssr", { emitAssets: true, noExternal: true }),
      },
      oxc: { jsx: { development: false } },
      plugins: [
        pluginWrenLink({ clientEntry, kind: "document" }),
        pluginWrenDevServer(ssrEntry),
        pluginWrenServerOnly(),
        ...pluginWrenCss(config.router!),
      ],
    }),
  };
};

export default wrenIntegrationSSX;
