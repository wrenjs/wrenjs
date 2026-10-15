import { normalizePath } from "vite";
import type { Entry } from "#/types.js";
import type { generateRouteManifest } from "./index.ts";

const code = (source: string) => ({ __wrenCode: source });

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
    const layouts = entry.layouts?.map(loaderFor);
    const proxies = entry.proxies?.map(loaderFor);
    return {
      kind: entry.kind,
      layouts: layouts?.map(code),
      module: code(loader),
      params: entry.params,
      pattern: entry.pattern,
      proxies: proxies?.map(code),
      stack: code(
        `createStack(${loader}, [${layouts?.join(", ") ?? ""}], [${proxies?.join(", ") ?? ""}])`,
      ),
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
