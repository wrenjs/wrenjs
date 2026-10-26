import Link from "@wren-js/core/link";

export default async function RootLayout({ children }: { children: JSX.Children }) {
  return (
    <>
      Has wrenjs/link
      <nav style={{ display: "flex", gap: "1rem" }}>
        <Link data-prefetch="hover" href="/">
          Index <code>/</code>
        </Link>
        <Link data-prefetch="hover" href="/nav-test">
          Nav Test <code>/nav-test</code>
        </Link>
      </nav>
      <div style={{ border: "2px solid black" }}>{children}</div>
    </>
  );
}
