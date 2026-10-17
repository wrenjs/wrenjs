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
    ...DOCS_NAV_LINKS.flatMap(({ links }) => links.map(({ icon }) => icon)),
    ...MAIN_NAV_LINKS.map(({ icon }) => icon),
    ...PACKAGE_MANAGERS.flatMap((item) => [
      `[html[data-${LS_PKG_KEY.replaceAll(":", "\\:")}=${item}]_&]:block`,
      `[html[data-${LS_PKG_KEY.replaceAll(":", "\\:")}=${item}]_&]:border-b-blue`,
    ]),
  ],

  shortcuts: {
    "bento-grid":
      "grid grid-cols-[repeat(2,var(--tile))] grid-rows-[repeat(2,var(--tile))] gap-3 rounded-[calc(var(--tile)/4)] [--tile:calc(var(--spacing)*16)] md:[--tile:8ch] md:gap-[1ch]",
    "bento-tile": "relative flex items-center justify-center rounded-[calc(var(--tile)/5)]",
    "docs-menu-panel":
      "absolute top-[calc(100%+0.5rem)] inset-x-3 max-h-[min(32rem,calc(100svh-9rem))] overflow-y-auto overscroll-contain p-4 border border-[#0000000d] rounded-2xl bg-bg shadow-[0_16px_48px_#18233b12,0_2px_8px_#18233b06] [scrollbar-width:thin] lg:left-auto lg:right-8 lg:w-80",
    "docs-menu-toggle":
      "flex min-h-10 items-center gap-2 px-1 py-1.5 rounded-lg text-gray-700 text-[0.8125rem] font-medium list-none cursor-pointer select-none touch-manipulation [&::-webkit-details-marker]:hidden",
    "docs-rail":
      "max-h-[calc(100svh-9rem)] overflow-y-auto overscroll-contain pb-4 [scrollbar-width:thin] [scrollbar-color:var(--colors-gray-200)_transparent]",
  },

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
