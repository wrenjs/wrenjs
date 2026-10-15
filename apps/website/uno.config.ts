import { FileSystemIconLoader } from "@iconify/utils/lib/loader/node-loaders";
import { defineConfig, presetIcons, presetWind4, transformerCompileClass } from "unocss";
import { DOCS_NAV_LINKS, LS_PKG_KEY, MAIN_NAV_LINKS, PACKAGE_MANAGERS } from "./src/constants";

export default defineConfig({
  outputToCssLayers: true,
  presets: [
    presetIcons({
      collections: {
        wren: FileSystemIconLoader("./src/assets/icon"),
      },
      scale: 1.2,
    }),
    presetWind4({
      variablePrefix: "",
    }),
  ],

  safelist: [
    "colors:blue",
    "colors:pink",
    "colors:purple",
    ...[...MAIN_NAV_LINKS, ...DOCS_NAV_LINKS].map(({ icon }) => icon),
    ...PACKAGE_MANAGERS.flatMap((item) => [
      `[html[data-${LS_PKG_KEY.replaceAll(":", "\\:")}=${item}]_&]:block`,
      `[html[data-${LS_PKG_KEY.replaceAll(":", "\\:")}=${item}]_&]:border-b-blue`,
    ]),
  ],

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
