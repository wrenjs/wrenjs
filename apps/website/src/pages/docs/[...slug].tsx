interface DocModule {
  config?: Record<string, unknown>;
  default: () => JSX.Component;
}

const docs = import.meta.glob<DocModule>("./**/*.mdx", { eager: true });

const toSlug = (path: string) => path.slice("./".length, -".mdx".length);

export default function DocsPage({ params }: { params: { slug: string } }) {
  const doc = docs[`./${params.slug}.mdx`];
  if (!doc || !doc.default) {
    return <h1>Not Found</h1>;
  }
  const Content = doc.default;
  return <Content />;
}

export function getStaticPaths() {
  return Object.keys(docs).map((path) => `/docs/${toSlug(path)}`);
}
