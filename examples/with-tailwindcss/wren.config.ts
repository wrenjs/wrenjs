import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "@wren-js/core/config";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
