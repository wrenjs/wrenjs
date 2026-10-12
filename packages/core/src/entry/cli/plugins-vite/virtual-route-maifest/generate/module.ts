import { normalizePath } from "vite";
import type { Entry } from "#/types.js";
import { ENTRY_WRAPPER_TYPES } from "#/constants.ts";
import type { generateRouteManifest } from "./index.ts";

export const generateRouteManifestModule = (
  manifest: Awaited<ReturnType<typeof generateRouteManifest>>,
  cacheModules: boolean,
): string => {
  const loaders = new Map<string, string>();
  const loaderFor = (entry: Entry) => {
    const file = normalizePath(entry.file);
    let name = loaders.get(file);
    if (!name) {
      name = `load${loaders.size}`;
      loaders.set(file, name);
    }
    return name;
  };
  const routes = JSON.stringify(manifest, (_key, entry: Entry | null) => {
    if (!entry || typeof entry.file !== "string") return entry;

    const loader = loaderFor(entry);
    const module = { __wrenCode: loader };
    // @ts-expect-error -- Not smart enough to know how to cast entry.kind here,
    // or how to tell Typescript that this is safe.
    // Or perhaps just doing 9,000 if statements here is better?
    if (ENTRY_WRAPPER_TYPES.includes(entry.kind)) return module;

    const layouts = (entry.layouts ?? []).map(loaderFor).join(", ");
    const proxies = (entry.proxies ?? []).map(loaderFor).join(", ");
    return {
      // groups: entry.groups,
      kind: entry.kind,
      layouts: entry.layouts,
      module,
      params: entry.params,
      pattern: entry.pattern,
      proxies: entry.proxies,
      // Loads the whole stack at once; identifiers only, so the JSON round-trip is safe.
      stack: { __wrenCode: `createStack(${loader}, [${layouts}], [${proxies}])` },
    };
  }).replace(/\{"__wrenCode":"([^"]+)"\}/g, "$1");

  const declarations = [...loaders].map(([file, name]) => {
    const load = `() => import(${JSON.stringify(file)})`;
    const loader = cacheModules ? `memoize(${load})` : load;
    return `const ${name} = ${loader};`;
  });

  return `
    ${
      cacheModules
        ? `function memoize(load) {
            let pending;
            return () => {
              pending ??= load().catch((error) => {
                pending = undefined;
                throw error;
              });
              return pending;
            };
          }`
        : ""
    }

    // Resolves a route's module, layouts, and proxies together; once loaded, returns
    // the same object synchronously so requests skip the promise machinery.
    function createStack(load, layouts, proxies) {
      let resolved;
      return () =>
        resolved ??
        Promise.all([
          load(),
          Promise.all(layouts.map((load) => load())),
          Promise.all(proxies.map((load) => load())),
        ]).then(([module, layouts, proxies]) => {
          const stack = { layouts, module, proxies };
          ${cacheModules ? "resolved = stack;" : ""}
          return stack;
        });
    }

    ${declarations.join("\n")}

    function deepFreeze(value) {
      if (value && typeof value === "object" && !Object.isFrozen(value)) {
        Object.values(value).forEach(deepFreeze);
        Object.freeze(value);
      }
      return value;
    }

    const manifest = deepFreeze(${routes});
    export const { dynamicNotFounds, dynamicRoutes, staticNotFounds, staticRoutes } = manifest;
    export default manifest;
  `;
};
