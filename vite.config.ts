import perfectionist from "eslint-plugin-perfectionist";
import sonarjs from "eslint-plugin-sonarjs";
import { defineConfig } from "vite-plus";

const ignorePatterns = ["node_modules", "dist", "**/benchmarks/**/*"];
export default defineConfig({
  fmt: {
    endOfLine: "lf",
    ignorePatterns,
    sortPackageJson: true,
    tabWidth: 2,
    useTabs: false,
  },
  lint: {
    categories: {
      correctness: "deny",
      perf: "warn",
      suspicious: "warn",
    },
    ignorePatterns,
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      { name: "sonarjs", specifier: "eslint-plugin-sonarjs" },
      { name: "perfectionist", specifier: "eslint-plugin-perfectionist" },
    ],
    options: { typeAware: true, typeCheck: true },
    plugins: ["jsdoc", "oxc", "promise", "typescript", "unicorn", "vitest"],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      ...sonarjs.configs.recommended.rules,
      ...perfectionist.configs["recommended-natural"].rules,
      "eslint/no-underscore-dangle": "allow",
      "perfectionist/sort-imports": [
        "error",
        {
          fallbackSort: { order: "asc", type: "type-import-first" },
          newlinesBetween: 0,
          order: "asc",
          type: "natural",
        },
      ],
      "sonarjs/todo-tag": "allow",
    },
  },

  run: {
    cache: true,
  },
  staged: {
    "*": "vp check --fix",
  },
});
