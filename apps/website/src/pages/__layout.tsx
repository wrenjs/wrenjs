import { LayoutFooter } from "./__layout-footer";
import { Nav } from "./__layout-nav";

export default function IndexLayout({
  children,
  request,
}: {
  children: JSX.Children;
  request: Request;
}) {
  const pathname = new URL(request.url).pathname;
  return (
    <div class=":uno:">
      <Nav path={pathname} />
      {children}
      <LayoutFooter />
    </div>
  );
}
