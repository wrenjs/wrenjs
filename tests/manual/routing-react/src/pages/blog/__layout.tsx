/**
 * Blog section layout — nested layout for /blog/* routes.
 * Wraps all pages inside src/pages/blog/ with a sidebar/header.
 *
 * This is itself wrapped by the root layout (src/layout.jsx),
 * so you get: RootLayout > BlogLayout > Page
 */
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "2rem" }}>
      <aside style={{ borderRight: "1px solid #ccc", minWidth: 160, paddingRight: "1rem" }}>
        <h3>Blog</h3>
        <nav>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li>
              <a href="/blog">All Posts</a>
            </li>
            <li>
              <a href="/">Home</a>
            </li>
          </ul>
        </nav>
      </aside>
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
