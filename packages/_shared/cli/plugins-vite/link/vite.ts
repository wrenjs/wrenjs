import type { Plugin } from "vite";
import {
  LINK_CLIENT_MODULE,
  LINK_SCRIPT_MODULE,
  PAGE_SCRIPT_URL_PREFIX,
} from "../../../constants.ts";
import { preloadModule } from "../../utils.ts";

const SCRIPT_IMPORT = "@wren-js/core/components/Link/wren-link";
const CLIENT_ID = `\0${LINK_CLIENT_MODULE}`;

export const pluginWrenLink = (options: {
  clientEntry: string;
  kind: "document" | "flight" | "native";
}): Plugin => ({
  async buildStart() {
    if (this.environment.config.consumer !== "server") return;
    await preloadModule(this, LINK_SCRIPT_MODULE);
  },
  config: () => ({ optimizeDeps: { exclude: [SCRIPT_IMPORT] } }),
  enforce: "pre",
  load: {
    filter: { id: new RegExp(`^${CLIENT_ID}$`) },
    handler() {
      const render =
        options.kind === "flight"
          ? `const client = await import(${JSON.stringify(options.clientEntry)});
           signal.throwIfAborted();
           return client.renderNavigation(response, signal);`
          : `throw new Error("Flight navigation is unavailable for this integration.");`;
      return `export const kind = ${JSON.stringify(options.kind)};
            export async function render(response, signal) { ${render} }`;
    },
  },
  name: "wrenjs-link",
  resolveId: {
    filter: { id: new RegExp(`^(?:${LINK_CLIENT_MODULE}|${LINK_SCRIPT_MODULE})$`) },
    async handler(source) {
      if (source === LINK_CLIENT_MODULE) return CLIENT_ID;
      const resolved = await this.resolve(SCRIPT_IMPORT);
      if (!resolved || resolved.external) {
        return this.error("Unable to resolve Wren Link's browser entry.");
      }
      return `\0${PAGE_SCRIPT_URL_PREFIX}${resolved.id}`;
    },
  },
});
