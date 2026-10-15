import "./__layout.css";

export default async function RootLayout({ children }: { children: JSX.Children }) {
  return (
    <html className="egg" lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <title>wren</title>
      </head>
      <body>
        Root has no wrenjs/link
        <nav style={{ display: "flex", gap: "1rem" }}>
          <a href="/">
            Index <code>/</code>
          </a>
          <a href="/nav-test">
            Nav Test <code>/nav-test</code>
          </a>
          <a href="/wren-link">
            Wren Link <code>/wren-link</code>
          </a>
        </nav>
        <div style={{ border: "3px solid black" }}>{children}</div>
      </body>
    </html>
  );
}
