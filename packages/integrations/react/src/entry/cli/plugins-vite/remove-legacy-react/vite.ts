import type { Plugin } from "vite";
import { PACKAGE_NAME } from "#/constants.ts";

const REGEX_LEGACY = /require\(\s*['"]\.\/cjs\/react-dom-server-legacy[^'"]*['"]\s*\)/g;
/**
 * This plugin is used to remove legacy React code from the final SSR bundle.
 * It was found that the SSR output bundle was quite large for some reason, turns out some extra legacy React code
 * is being bundled that is not used by us. Thankfully, this is able to be removed and saves ~40% on the SSR bundle size.
 *
 **/
export const pluginWrenRemoveLegacyReact = (): Plugin => {
  return {
    applyToEnvironment(env) {
      return env.name === "ssr";
    },
    name: `${PACKAGE_NAME}:remove-legacy-react`,
    transform(code, id) {
      if (id.includes("react-dom") && id.includes("server.edge")) {
        return code.replaceAll(REGEX_LEGACY, "({})");
      }
      return undefined;
    },
  };
};
