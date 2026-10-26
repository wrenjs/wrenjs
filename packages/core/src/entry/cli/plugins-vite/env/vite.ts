import type { Plugin } from "vite";
import { parseSync, perEnvironmentState, resolveEnvPrefix, transformWithOxc, Visitor } from "vite";
import { WREN_NAME } from "#/constants.ts";
import { createServerEnv } from "./runtime.ts";

const VIRTUAL_ID = `virtual:${WREN_NAME}-server-env`;
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const ENV_PREFIX = "import.meta.env.";

export const pluginServerEnv = (): Plugin => {
  const getDefine = perEnvironmentState(({ config }) => {
    const define = Object.fromEntries(
      Object.entries(config.env).map(([key, value]) => [ENV_PREFIX + key, JSON.stringify(value)]),
    );
    for (const [key, value] of Object.entries(config.define ?? {})) {
      if (key.startsWith(ENV_PREFIX)) {
        define[key] = typeof value === "string" ? value : (JSON.stringify(value) ?? "undefined");
      }
    }
    define[`${ENV_PREFIX}SSR`] = "true";
    return define;
  });

  return {
    applyToEnvironment: (environment) => environment.config.consumer === "server",
    load: {
      filter: { id: new RegExp(`^${RESOLVED_ID}$`) },
      handler() {
        const values = Object.entries(getDefine(this)).map(
          ([key, value]) => `${JSON.stringify(key.slice(ENV_PREFIX.length))}: ${value}`,
        );
        const prefixes = resolveEnvPrefix({ envPrefix: this.environment.config.envPrefix });
        return `export default (${createServerEnv.toString()})({${values.join(",")}}, ${JSON.stringify(prefixes)});`;
      },
    },
    name: `${WREN_NAME}-server-env`,
    resolveId: {
      filter: { id: new RegExp(`^${VIRTUAL_ID}$`) },
      handler: () => RESOLVED_ID,
    },
    transform: {
      filter: {
        code: /\bimport\s*\.\s*meta\s*(?:\?\s*)?\.\s*env\b/,
        id: /\.[cm]?[jt]sx?(?:$|\?)/,
      },
      handler(code, id) {
        if (id === RESOLVED_ID) return null;
        let name = "__wrenServerEnv";
        // Escaped identifiers can collide without containing the literal name.
        if (code.includes(name) || code.includes("\\u")) {
          const { errors, program } = parseSync(id.split("?")[0], code);
          if (errors.length > 0) return this.error(errors[0].message);
          const names = new Set<string>();
          new Visitor({ Identifier: (node) => void names.add(node.name) }).visit(program);
          while (names.has(name)) name += "_";
        }
        return transformWithOxc(code, id, {
          define: { ...getDefine(this), "import.meta.env": name },
          inject: { [name]: [VIRTUAL_ID, "default"] },
          jsx: "preserve",
          tsconfig: false,
        });
      },
    },
  };
};
