import { defineConfig } from "@wrenjs/core/config";
import uno from "unocss/vite";

export default defineConfig({
  vite: {
    // In a root layout or similar, you must insert
    // import "virtual:uno.css";
    plugins: [uno()],
  },
});
