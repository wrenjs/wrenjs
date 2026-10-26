declare module "virtual:wrenjs-static-assets" {
  export interface StaticAsset {
    encodings?: {
      br?: readonly [file: string, size: number];
      gzip?: readonly [file: string, size: number];
    };
    etag: string;
    file: string;
    headers: readonly string[];
    size: number;
  }

  const assets: Readonly<Record<string, StaticAsset>>;
  export default assets;
  export const ASSETS_PREFIX: null | string;
}
