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
  // Glass gradients reference these theme variables outside utility classes.
  safelist: ["colors:blue", "colors:pink", "colors:purple"],
  theme: {
    colors: {
      bg: "#faf9fd",
      blue: "rgb(96 165 250)",
      pink: "rgb(236 72 153)",
      purple: "rgb(192 132 252)",
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
