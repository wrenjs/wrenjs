/** Build-time list of page-script public URLs, indexed by registration order; injected into JSX modules by the page-scripts plugin. */
declare module "virtual:wrenjs-page-scripts" {
  const scripts: string[];
  export default scripts;
}

/** Side-effect import hoisting a page script for every page rendering the importer. */
declare module "virtual:wrenjs-hoist:*" {}
