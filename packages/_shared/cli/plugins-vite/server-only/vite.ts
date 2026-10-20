import type { Plugin } from "vite";

const ID = "server-only";
const RESOLVED_ID = `\0${ID}`;

export const pluginWrenServerOnly = (): Plugin => ({
  config: () => ({ resolve: { noExternal: [ID] } }),
  enforce: "pre",
  load: { filter: { id: new RegExp(`^${RESOLVED_ID}$`) }, handler: () => "export {}" },
  name: "wrenjs-server-only",
  resolveId: {
    filter: { id: new RegExp(`^${ID}$`) },
    handler(_, importer, options) {
      if (this.environment.config.consumer === "client" && !("scan" in options && options.scan)) {
        this.error(`[wrenjs] "${ID}" cannot be imported from client code (${importer}).`);
      }
      return RESOLVED_ID;
    },
  },
});
