import type { Plugin } from "vite";
import {
  LINK_CLIENT_MODULE,
  LINK_SCRIPT_MODULE,
  PAGE_SCRIPT_URL_PREFIX,
} from "../../../constants.ts";

const SCRIPT_IMPORT = "wrenjs/components/Link/wren-link";
const CLIENT_ID = `\0${LINK_CLIENT_MODULE}`;

/** The integration-specific parts of Wren Link: its browser script URL and how it renders Flight. */
export const pluginWrenLink = (options: {
  clientEntry: string;
  kind: "document" | "flight" | "native";
}): Plugin => ({
  async buildStart() {
    // Register the script with the page-script registry before the client environment builds;
    // React's HTML renderer, which imports the URL, is built after the client.
    if (this.environment.config.consumer !== "server") return;
    // `skipSelf` defaults to true, and this plugin is the one resolving the module.
    const resolved = await this.resolve(LINK_SCRIPT_MODULE, undefined, { skipSelf: false });
    if (resolved) await this.load({ id: resolved.id });
  },
  config: () => ({ optimizeDeps: { exclude: [SCRIPT_IMPORT] } }),
  enforce: "pre",
  load(id) {
    if (id !== CLIENT_ID) return null;
    const render =
      options.kind === "flight"
        ? `const client = await import(${JSON.stringify(options.clientEntry)});
           signal.throwIfAborted();
           return client.renderNavigation(response, signal);`
        : `throw new Error("Flight navigation is unavailable for this integration.");`;
    return `export const kind = ${JSON.stringify(options.kind)};
            export async function render(response, signal) { ${render} }`;
  },
  name: "wrenjs-link",
  async resolveId(source) {
    if (source === LINK_CLIENT_MODULE) return CLIENT_ID;
    if (source !== LINK_SCRIPT_MODULE) return null;
    const resolved = await this.resolve(SCRIPT_IMPORT);
    if (!resolved || resolved.external) {
      return this.error("Unable to resolve Wren Link's browser entry.");
    }
    return `\0${PAGE_SCRIPT_URL_PREFIX}${resolved.id}`;
  },
});
