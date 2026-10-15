import type { App, Framework } from "./generate.ts";

export interface Runner {
  build: string;
  clean: string[];
  framework: Framework;
  install: string;
  name: string;
  prerendered: string;
}

export const APP: App = {
  components: 500,
  componentsPerPage: 5,
  pagesPerSection: 40,
  posts: 10000,
  sections: 50,
};

export const SAMPLES = 5;

export const WARMUPS = 1;

const THIRD_PARTY = {
  BUILD: "pnpm run build",
  INSTALL: "pnpm install --ignore-workspace --yes --dangerously-allow-all-builds --trust-lockfile",
};

const WREN = {
  BUILD: "pnpm run build",
  CLEAN: ["dist", "node_modules/.vite"],
  INSTALL: "vp install",
  PRERENDERED: "dist/client",
};

export const RUNNERS: Runner[] = [
  {
    build: THIRD_PARTY.BUILD,
    clean: ["dist", ".astro", "node_modules/.astro", "node_modules/.vite"],
    framework: "astro",
    install: THIRD_PARTY.INSTALL,
    name: "Astro",
    prerendered: "dist/client",
  },
  {
    build: THIRD_PARTY.BUILD,
    clean: [".next"],
    framework: "nextjs",
    install: THIRD_PARTY.INSTALL,
    name: "NextJS",
    prerendered: ".next/server/app",
  },
  {
    build: THIRD_PARTY.BUILD,
    clean: [".svelte-kit", "build", "node_modules/.vite"],
    framework: "sveltekit",
    install: THIRD_PARTY.INSTALL,
    name: "SvelteKit",
    prerendered: "build/prerendered",
  },
  {
    build: WREN.BUILD,
    clean: WREN.CLEAN,
    framework: "wren-preact",
    install: WREN.INSTALL,
    name: "Wren (Preact)",
    prerendered: WREN.PRERENDERED,
  },
  {
    build: WREN.BUILD,
    clean: WREN.CLEAN,
    framework: "wren-react",
    install: WREN.INSTALL,
    name: "Wren (React)",
    prerendered: WREN.PRERENDERED,
  },
  {
    build: WREN.BUILD,
    clean: WREN.CLEAN,
    framework: "wren-ssx",
    install: WREN.INSTALL,
    name: "Wren (SSX)",
    prerendered: WREN.PRERENDERED,
  },
];
