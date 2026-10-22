import type { UserConfig } from "vite";
import type { CopyEntry, PackUserConfig } from "vite-plus/pack";
import { defineConfig } from "vite-plus";

interface PackOptions {
  copy?: CopyEntry[];
  entry: Record<string, string>;
  exports?: Record<string, unknown>;
  tsconfig: string;
}

export const definePackConfig = ({
  copy = [],
  entry,
  exports = {},
  tsconfig,
}: PackOptions): PackUserConfig => ({
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

export const defineIntegrationConfig = (pack: PackOptions, lint?: UserConfig["lint"]) =>
  defineConfig({
    fmt: {},
    lint: {
      categories: { correctness: "deny", perf: "warn", suspicious: "warn" },
      options: { typeAware: true, typeCheck: true },
      ...lint,
    },
    pack: definePackConfig({
      ...pack,
      copy: [
        { from: "./src/global.d.ts", rename: "types.d.ts", to: "./dist" },
        ...(pack.copy ?? []),
      ],
      exports: { "./types": { types: "./dist/types.d.ts" }, ...pack.exports },
    }),
  });
