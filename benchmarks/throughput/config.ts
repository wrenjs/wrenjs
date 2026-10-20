export const PATHS = ["/", "/a", "/a/b/c"];

export const COLD_SAMPLES = 20;

const THIRD_PARTY = {
  BUILD: "pnpm run build",
  INSTALL: "pnpm install --ignore-workspace --yes --dangerously-allow-all-builds --trust-lockfile",
};

export const RUNNERS = [
  // {
  //   cwd: "./nextjs",
  //   name: "NextJS",
  //   install: THIRD_PARTY.INSTALL,
  //   build: THIRD_PARTY.BUILD,
  //   serve: "pnpm run serve",
  // },

  // {
  //   cwd: "./astro",
  //   name: "Astro",
  //   install: THIRD_PARTY.INSTALL,
  //   build: THIRD_PARTY.BUILD,
  //   serve: "pnpm run serve",
  // },

  // {
  //   build: THIRD_PARTY.BUILD,
  //   cwd: "./sveltekit",
  //   install: THIRD_PARTY.INSTALL,
  //   name: "SvelteKit",
  //   serve: "pnpm run serve",
  // },

  // {
  //   build: THIRD_PARTY.BUILD,
  //   cwd: "./waku",
  //   install: THIRD_PARTY.INSTALL,
  //   name: "Waku",
  //   serve: "pnpm run serve",
  // },

  // {
  //   cwd: "./pracht",
  //   name: "Pracht",
  //   install: THIRD_PARTY.INSTALL,
  //   build: THIRD_PARTY.BUILD,
  //   serve: "pnpm run serve",
  // },

  // {
  //   cwd: "./tanstack-start",
  //   name: "Tanstack Start (React)",
  //   install: THIRD_PARTY.INSTALL,
  //   build: THIRD_PARTY.BUILD,
  //   serve: "pnpm run serve",
  // },

  {
    build: "pnpm run build",
    cwd: "./wren-react",
    install: "vp install",
    name: "Wren (React)",
    serve: "node ./dist/server.mjs",
  },

  {
    build: "pnpm run build",
    cwd: "./wren-preact",
    install: "vp install",
    name: "Wren (Preact)",
    serve: "node ./dist/server.mjs",
  },

  {
    build: "pnpm run build",
    cwd: "./wren-ssx",
    install: "vp install",
    name: "Wren (SSX)",
    serve: "node ./dist/server.mjs",
  },
];
