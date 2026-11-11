import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "@wrenjs/core/config";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
