import type { CopyEntry, PackUserConfig } from "vite-plus/pack";

export const definePackConfig = ({
  copy = [],
  entry,
  exports = {},
  tsconfig,
}: {
  copy?: CopyEntry[];
  entry: Record<string, string>;
  exports?: Record<string, unknown>;
  tsconfig: string;
}): PackUserConfig => ({
  copy: [{ from: "./src/tsconfig/*.json", to: "./dist/tsconfig" }, ...copy],
  deps: { neverBundle: [/^virtual:wrenjs-/], resolveDepSubpath: true },
  dts: { generator: "tsgo", tsconfig },
  entry,
  exports: {
    customExports: (generated) => ({
      ...generated,
      "./tsconfig/*": "./dist/tsconfig/*.json",
      "./tsconfig/*.json": "./dist/tsconfig/*.json",
      ...exports,
    }),
  },
  minify: true,
});
