import { FileSystemIconLoader } from "@iconify/utils/lib/loader/node-loaders";
import { defineConfig, presetIcons, presetWind4, transformerCompileClass } from "unocss";

export default defineConfig({
  outputToCssLayers: true,
  presets: [
    presetIcons({
      collections: {
        wren: FileSystemIconLoader("./src/assets/icon"),
      },
    }),
    presetWind4({
      variablePrefix: "",
    }),
  ],

  safelist: ["colors:blue", "colors:pink", "colors:purple"],

  theme: {
    colors: {
      bg: "oklch(0.9853 0.0049 291)",
      blue: "oklch(0.707 0.165 254.6)",
      pink: "oklch(0.656 0.241 354.3)",
      purple: "oklch(0.714 0.155 301.7)",
    },
    font: {
      accent: "var(--font-accent)",
    },
  },
  transformers: [
    transformerCompileClass({
      classPrefix: "",
    }),
  ],
});
