import type { ComponentChildren } from "preact";
import { getPagePath } from "#/utils/path";
import { DocsNavigation, type Heading } from "./__layout-nav";

const outlines = import.meta.glob<Heading[]>("./**/*.mdx", { eager: true, import: "headings" });

export const head = () => <title>WrenJS Docs</title>;

export default function DocsLayout({
  children,
  request,
}: {
  children: ComponentChildren;
  request: Request;
}) {
  const path = getPagePath(request.url);
  const headings = outlines[`./${path.slice("/docs/".length)}.mdx`] ?? [];

  return (
    <DocsNavigation headings={headings} path={path}>
      {children}
    </DocsNavigation>
  );
}
