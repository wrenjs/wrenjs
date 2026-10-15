import type { ConfigEnv, EnvironmentOptions } from "vite";

export const clientEnvironment = (input: string, outDir?: string): EnvironmentOptions => ({
  build: { outDir, rolldownOptions: { input: { index: input } } },
  consumer: "client",
});

export const serverEnvironment = (
  env: ConfigEnv,
  input: string,
  outDir: string,
  { emitAssets, noExternal }: { emitAssets?: boolean; noExternal?: boolean } = {},
): EnvironmentOptions => ({
  build: {
    emitAssets,
    outDir,
    reportCompressedSize: false,
    rolldownOptions: { input: { index: input } },
    ssr: true,
  },
  consumer: "server",
  define: { "process.env.NODE_ENV": JSON.stringify(env.mode) },
  resolve: noExternal && env.command === "build" ? { noExternal: true } : {},
});
