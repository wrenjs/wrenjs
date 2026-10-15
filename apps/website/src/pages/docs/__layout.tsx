import type { ComponentChildren } from "preact";
import { DocsNavigation } from "./__layout-nav";

export const head = () => {
  return (
    <>
      <title>WrenJS Docs</title>
    </>
  );
};

export default function DocsLayout({
  children,
  request,
}: {
  children: ComponentChildren;
  request: Request;
}) {
  const pathname = new URL(request.url).pathname.split("_.flt")[0];
  const path = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  return <DocsNavigation path={path}>{children}</DocsNavigation>;
}
