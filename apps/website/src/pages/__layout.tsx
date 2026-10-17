import type { ComponentChildren } from "preact";
import { getPagePath } from "#/utils/path";
import { LayoutFooter } from "./__layout-footer";
import { Nav } from "./__layout-nav";

export default function IndexLayout({
  children,
  request,
}: {
  children: ComponentChildren;
  request: Request;
}) {
  return (
    <div class=":uno:">
      <Nav path={getPagePath(request.url)} />
      {children}
      <LayoutFooter />
    </div>
  );
}
