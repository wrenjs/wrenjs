import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, posix } from "node:path";

export interface App {
  components: number;
  componentsPerPage: number;
  pagesPerSection: number;
  posts: number;
  sections: number;
}

export type Framework = keyof typeof TARGETS;

type Block = false | string[];
type Files = Record<string, string>;

interface Page {
  components: number[];
  page: number;
  section: number;
  seed: number;
}

export const MARKER = "data-bench-page";

const ITEMS = 5;
const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

const range = (length: number) => Array.from({ length }, (_, index) => index);

const indent = (lines: string[], depth = 2) =>
  lines.map((line) => (line ? `${" ".repeat(depth)}${line}` : line));

const blocks = (...items: Block[]) =>
  items.flatMap((block) => (block && block.length > 0 ? [block.join("\n")] : [])).join("\n\n");

const code = (...items: Block[]) => `${blocks(...items)}\n`;

const specifier = (from: string, to: string) => {
  const path = posix.relative(posix.dirname(from), to);
  return path.startsWith(".") ? path : `./${path}`;
};

const imports = (file: string, ids: number[], component: (id: number) => string) =>
  ids.map((id) => `import Component${id} from "${specifier(file, component(id))}";`);

const staticSlugs = (app: App, item: string) =>
  `Array.from({ length: ${app.posts} }, (_, index) => ${item})`;

export const countPages = (app: App) => 1 + app.sections * app.pagesPerSection + app.posts;

const pagesOf = (app: App): Page[] =>
  range(app.sections).flatMap((section) =>
    range(app.pagesPerSection).map((page) => {
      const seed = section * app.pagesPerSection + page;
      return {
        components: range(app.componentsPerPage).map(
          (slot) => (seed * app.componentsPerPage + slot) % app.components,
        ),
        page,
        section,
        seed,
      };
    }),
  );

const postComponents = (app: App) =>
  range(app.componentsPerPage).map((slot) => slot % app.components);

const componentMarkup = (id: number) => [
  `<section data-component="${id}">`,
  `  <h2>Component ${id}</h2>`,
  "  <ul>",
  ...range(ITEMS).map((item) => `    <li>Item ${item} of {seed}</li>`),
  "  </ul>",
  "</section>",
];

const articleMarkup = (path: string, title: string, ids: number[], seed: number) => [
  `<article ${MARKER}="${path}">`,
  `  <h1>${title}</h1>`,
  `  <p>${LOREM}</p>`,
  ...ids.map((id) => `  <Component${id} seed={${seed}} />`),
  "</article>",
];

const pageMarkup = ({ components, page, section, seed }: Page) =>
  articleMarkup(
    `/section-${section}/page-${page}`,
    `Section ${section}, page ${page}`,
    components,
    seed,
  );

const postMarkup = (app: App, slug: string) =>
  articleMarkup("/posts/[slug]", `{${slug}}`, postComponents(app), 0);

const homeMarkup = (app: App) => [
  `<article ${MARKER}="/">`,
  "  <h1>Home</h1>",
  "  <ul>",
  ...range(app.sections).map(
    (section) => `    <li><a href="/section-${section}/page-0">Section ${section}</a></li>`,
  ),
  "  </ul>",
  '  <a href="/posts/post-0">Posts</a>',
  "</article>",
];

const bodyMarkup = (children: string) => [
  "<header>",
  '  <a href="/">Home</a>',
  "</header>",
  `<main>${children}</main>`,
  "<footer>Footer</footer>",
];

const documentMarkup = (children: string) => [
  '<html lang="en">',
  "  <head>",
  "    <title>Benchmark</title>",
  "  </head>",
  "  <body>",
  ...indent(bodyMarkup(children), 4),
  "  </body>",
  "</html>",
];

const sectionMarkup = (section: number, children: string) => [
  `<div data-section="${section}">`,
  `  <aside>Section ${section}</aside>`,
  `  ${children}`,
  "</div>",
];

const jsx = (declaration: string, markup: string[], statements: string[] = []) => [
  `export default ${declaration} {`,
  ...indent(statements),
  "  return (",
  ...indent(markup, 4),
  "  );",
  "}",
];

const jsxComponents = (app: App, component: (id: number) => string): Files =>
  Object.fromEntries(
    range(app.components).map((id) => [
      `${component(id)}.tsx`,
      code(jsx(`function Component${id}({ seed }: { seed: number })`, componentMarkup(id))),
    ]),
  );

const svelte = (script: string[], markup: string[]) =>
  code(script.length > 0 && ['<script lang="ts">', ...indent(script), "</script>"], markup);

const astroFile = (frontmatter: Block[], markup: string[]) => {
  const script = blocks(...frontmatter);
  return code(script ? ["---", script, "---"] : false, markup);
};

const wrap = (tag: string, markup: string[]) => [`<${tag}>`, ...indent(markup), `</${tag}>`];

const astro = (app: App, prerender: boolean): Files => {
  const component = (id: number) => `src/components/component-${id}.astro`;
  const layout = (section: number) => `src/layouts/section-${section}.astro`;
  const flag: Block = prerender && ["export const prerender = true;"];
  const root = "src/layouts/root.astro";
  const home = "src/pages/index.astro";
  const post = "src/pages/posts/[slug].astro";
  const files: Files = {
    [home]: astroFile(
      [[`import Root from "${specifier(home, root)}";`], flag],
      wrap("Root", homeMarkup(app)),
    ),
    [post]: astroFile(
      [
        [
          `import Root from "${specifier(post, root)}";`,
          ...imports(post, postComponents(app), component),
        ],
        flag,
        prerender && [
          "export function getStaticPaths() {",
          `  return ${staticSlugs(app, "({ params: { slug: `post-${index}` } })")};`,
          "}",
        ],
        ["const { slug } = Astro.params;"],
      ],
      wrap("Root", postMarkup(app, "slug")),
    ),
    [root]: astroFile([], documentMarkup("<slot />")),
  };
  for (const id of range(app.components)) {
    files[component(id)] = astroFile(
      [["interface Props {", "  seed: number;", "}"], ["const { seed } = Astro.props;"]],
      componentMarkup(id),
    );
  }
  for (const section of range(app.sections)) {
    files[layout(section)] = astroFile(
      [[`import Root from "${specifier(layout(section), root)}";`]],
      wrap("Root", sectionMarkup(section, "<slot />")),
    );
  }
  for (const page of pagesOf(app)) {
    const file = `src/pages/section-${page.section}/page-${page.page}.astro`;
    files[file] = astroFile(
      [
        [
          `import Layout from "${specifier(file, layout(page.section))}";`,
          ...imports(file, page.components, component),
        ],
        flag,
      ],
      wrap("Layout", pageMarkup(page)),
    );
  }
  return files;
};

const nextjs = (app: App, prerender: boolean): Files => {
  const component = (id: number) => `src/components/component-${id}`;
  const props = "{ children }: { children: ReactNode }";
  const typeImport = ['import type { ReactNode } from "react";'];
  const post = "src/app/posts/[slug]/page.tsx";
  const files: Files = {
    ...jsxComponents(app, component),
    [post]: code(
      imports(post, postComponents(app), component),
      prerender && [
        "export function generateStaticParams() {",
        `  return ${staticSlugs(app, "({ slug: `post-${index}` })")};`,
        "}",
      ],
      jsx(
        "async function Post({ params }: { params: Promise<{ slug: string }> })",
        postMarkup(app, "slug"),
        ["const { slug } = await params;"],
      ),
    ),
    "src/app/layout.tsx": code(
      typeImport,
      [`export const dynamic = "${prerender ? "force-static" : "force-dynamic"}";`],
      jsx(`function RootLayout(${props})`, documentMarkup("{children}")),
    ),
    "src/app/page.tsx": code(jsx("function Home()", homeMarkup(app))),
  };
  for (const section of range(app.sections)) {
    files[`src/app/section-${section}/layout.tsx`] = code(
      typeImport,
      jsx(`function SectionLayout(${props})`, sectionMarkup(section, "{children}")),
    );
  }
  for (const page of pagesOf(app)) {
    const file = `src/app/section-${page.section}/page-${page.page}/page.tsx`;
    files[file] = code(
      imports(file, page.components, component),
      jsx("function Page()", pageMarkup(page)),
    );
  }
  return files;
};

const sveltekit = (app: App, prerender: boolean): Files => {
  const component = (id: number) => `src/lib/components/component-${id}.svelte`;
  const children = ["let { children } = $props();"];
  const post = "src/routes/posts/[slug]/+page.svelte";
  const files: Files = {
    [post]: svelte(
      [...imports(post, postComponents(app), component), "", "let { params } = $props();"],
      postMarkup(app, "params.slug"),
    ),
    "src/app.html": code([
      "<!doctype html>",
      '<html lang="en">',
      "  <head>",
      "    <title>Benchmark</title>",
      "    %sveltekit.head%",
      "  </head>",
      "  <body>",
      '    <div style="display: contents">%sveltekit.body%</div>',
      "  </body>",
      "</html>",
    ]),
    "src/routes/+layout.svelte": svelte(children, bodyMarkup("{@render children()}")),
    "src/routes/+page.svelte": svelte([], homeMarkup(app)),
  };
  if (prerender) {
    files["src/routes/+layout.ts"] = code(["export const prerender = true;"]);
    files["src/routes/posts/[slug]/+page.ts"] = code([
      `export const entries = () => ${staticSlugs(app, "({ slug: `post-${index}` })")};`,
    ]);
  }
  for (const id of range(app.components)) {
    files[component(id)] = svelte(
      ["let { seed }: { seed: number } = $props();"],
      componentMarkup(id),
    );
  }
  for (const section of range(app.sections)) {
    files[`src/routes/section-${section}/+layout.svelte`] = svelte(
      children,
      sectionMarkup(section, "{@render children()}"),
    );
  }
  for (const page of pagesOf(app)) {
    const file = `src/routes/section-${page.section}/page-${page.page}/+page.svelte`;
    files[file] = svelte(imports(file, page.components, component), pageMarkup(page));
  }
  return files;
};

const wren =
  (children: { import?: string; type: string }) =>
  (app: App, prerender: boolean): Files => {
    const component = (id: number) => `src/components/component-${id}`;
    const props = `{ children }: { children: ${children.type} }`;
    const typeImport: Block = children.import !== undefined && [children.import];
    const post = "src/pages/posts/[slug].tsx";
    const files: Files = {
      ...jsxComponents(app, component),
      [post]: code(
        imports(post, postComponents(app), component),
        prerender && [
          "export function getStaticPaths() {",
          `  return ${staticSlugs(app, "`/posts/post-${index}`")};`,
          "}",
        ],
        jsx(
          "function Post({ params }: { params: { slug: string } })",
          postMarkup(app, "params.slug"),
        ),
      ),
      "src/pages/__layout.tsx": code(
        typeImport,
        prerender && ["export const config = { prerender: true };"],
        jsx(`function RootLayout(${props})`, documentMarkup("{children}")),
      ),
      "src/pages/index.tsx": code(jsx("function Home()", homeMarkup(app))),
    };
    for (const section of range(app.sections)) {
      files[`src/pages/section-${section}/__layout.tsx`] = code(
        typeImport,
        jsx(`function SectionLayout(${props})`, sectionMarkup(section, "{children}")),
      );
    }
    for (const page of pagesOf(app)) {
      const file = `src/pages/section-${page.section}/page-${page.page}.tsx`;
      files[file] = code(
        imports(file, page.components, component),
        jsx("function Page()", pageMarkup(page)),
      );
    }
    return files;
  };

const TARGETS = {
  astro,
  nextjs,
  sveltekit,
  "wren-preact": wren({
    import: 'import type { ComponentChildren } from "preact";',
    type: "ComponentChildren",
  }),
  "wren-react": wren({ import: 'import type { ReactNode } from "react";', type: "ReactNode" }),
  "wren-ssx": wren({ type: "JSX.Children" }),
};

export const generate = async (
  framework: Framework,
  root: string,
  app: App,
  prerender: boolean,
) => {
  const files = Object.entries(TARGETS[framework](app, prerender));
  await rm(join(root, "src"), { force: true, recursive: true });
  await Promise.all(
    [...new Set(files.map(([file]) => dirname(join(root, file))))].map((directory) =>
      mkdir(directory, { recursive: true }),
    ),
  );
  await Promise.all(files.map(([file, contents]) => writeFile(join(root, file), contents)));
  return files.length;
};
