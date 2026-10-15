import type { ComponentChildren } from "preact";
import { LayoutFooter } from "./__layout-footer";
import { Nav } from "./__layout-nav";

export default function IndexLayout({
  children,
  request,
}: {
  children: ComponentChildren;
  request: Request;
}) {
  const pathname = new URL(request.url).pathname.split("_.flt")[0];
  return (
    <div class=":uno:">
      <Nav path={pathname} />
      {children}
      <LayoutFooter />
    </div>
  );
}
