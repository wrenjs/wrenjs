import type { WrenIntegration } from "@wren-js/core/config";
import prefresh from "@prefresh/vite";
import { fileURLToPath } from "node:url";
import { clientEnvironment, serverEnvironment } from "#shared/cli/environments.ts";
import { pluginWrenCss } from "#shared/cli/plugins-vite/css/vite.ts";
import { pluginWrenDevServer } from "#shared/cli/plugins-vite/dev-server/vite.ts";
import { pluginWrenIslands } from "#shared/cli/plugins-vite/islands/vite.ts";
import { pluginWrenLink } from "#shared/cli/plugins-vite/link/vite.ts";
import { PACKAGE_NAME } from "../../constants.ts";
import { pluginWrenPreactJsx } from "./plugins-vite/preact-jsx/vite.ts";

const wrenIntegrationPreact = (): WrenIntegration => {
  const ssrEntry = fileURLToPath(new URL("./entry/ssr.mjs", import.meta.url));
  const prerenderEntry = fileURLToPath(new URL("./entry/prerender.mjs", import.meta.url));
  const clientEntry = fileURLToPath(new URL("./entry/client.mjs", import.meta.url));

  return {
    name: PACKAGE_NAME,
    prerender: { entry: prerenderEntry, environment: "ssr" },
    viteConfig: async (config, env) => ({
      environments: {
        client: clientEnvironment(clientEntry, "dist/client"),
        ssr: serverEnvironment(env, ssrEntry, "dist/ssr", { emitAssets: true, noExternal: true }),
      },
      plugins: [
        pluginWrenLink({ clientEntry, kind: "flight" }),
        pluginWrenIslands({
          runtimeEntry: clientEntry,
          wrapperImport: `${PACKAGE_NAME}/runtime/island`,
        }),
        pluginWrenDevServer(ssrEntry),
        ...pluginWrenCss(config.router!),
        pluginWrenPreactJsx(),
        await prefresh(),
      ],
    }),
  };
};

export default wrenIntegrationPreact;
