import { PACKAGE_NAME } from "#/constants.ts";

const RSC_PLUGIN = "@vitejs/plugin-rsc";

/**
 * This plugin is needed to prevent an error during (dev or build (?)) with the RSC plugin.
 */
export const pluginWrenBridgeRSC = () => {
  return {
    configEnvironment(_name: string, config: { optimizeDeps?: { include?: string[] } } = {}) {
      const { optimizeDeps: { include } = {} } = config;
      if (!include?.length) {
        return;
      }

      for (let i = 0; i < include.length; i++) {
        if (include[i].startsWith(RSC_PLUGIN)) {
          include[i] = `${PACKAGE_NAME} > ${include[i]}`;
        }
      }
    },
    name: `${PACKAGE_NAME}:bridge-rsc`,
  };
};
