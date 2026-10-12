import { LayoutFooter } from "./__layout-footer";
import { Nav } from "./__layout-nav";

export default function IndexLayout({ children }: { children: JSX.Children }) {
  return (
    <div class=":uno:">
      <Nav />
      {children}
      <LayoutFooter />
    </div>
  );
}
