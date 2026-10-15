declare module "virtual:wrenjs-static-assets" {
  const assets: Readonly<Record<string, readonly [file: string, headers: string[]]>>;
  export default assets;
}
