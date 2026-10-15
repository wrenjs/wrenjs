declare module "virtual:wrenjs-page-scripts" {
  const manifest: { routes: Record<string, string[]>; scripts: Record<string, string> };
  export default manifest;
}

declare module "virtual:wrenjs-hoist:*" {}
