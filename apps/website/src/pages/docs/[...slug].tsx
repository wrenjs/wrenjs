import type { ComponentType } from "preact";

const docs = import.meta.glob<ComponentType>("./**/*.mdx", { eager: true, import: "default" });

const toSlug = (path: string) => path.slice("./".length, -".mdx".length);

export default function DocsPage({ params }: { params: { slug: string } }) {
  const Content = docs[`./${params.slug}.mdx`];
  if (!Content) {
    return <h1>Not Found</h1>;
  }
  return <Content />;
}

export function getStaticPaths() {
  return Object.keys(docs).map((path) => `/docs/${toSlug(path)}`);
}
