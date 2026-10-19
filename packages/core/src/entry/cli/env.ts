import process from "node:process";
import { loadEnv } from "vite";

const envKey = (key: string) => (process.platform === "win32" ? key.toUpperCase() : key);

export const createEnvLoader = () => {
  const injected = new Map<string, string>();

  return (mode: string, root: string): void => {
    for (const [key, value] of injected) {
      if (process.env[key] === value) delete process.env[key];
    }
    injected.clear();

    const existing = new Set(Object.keys(process.env).map(envKey));
    const loaded = loadEnv(mode, root, "");
    for (const [key, value] of Object.entries(loaded)) {
      const normalized = envKey(key);
      if (existing.has(normalized)) continue;
      process.env[key] = value;
      injected.set(normalized, value);
    }
  };
};
