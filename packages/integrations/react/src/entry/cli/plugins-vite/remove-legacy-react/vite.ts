import type { Plugin } from "vite";
import { PACKAGE_NAME } from "#/constants.ts";

const REGEX_LEGACY = /require\(\s*['"]\.\/cjs\/react-dom-server-legacy[^'"]*['"]\s*\)/g;

export const pluginWrenRemoveLegacyReact = (): Plugin => ({
  applyToEnvironment: (env) => env.name === "ssr",
  name: `${PACKAGE_NAME}:remove-legacy-react`,
  transform: {
    filter: { code: "react-dom-server-legacy", id: /react-dom.*server\.(?:browser|bun|edge|node)/ },
    handler(code) {
      const replaced = code.replaceAll(REGEX_LEGACY, "({})");
      return replaced === code ? null : { code: replaced, map: null };
    },
  },
});
