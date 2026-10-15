/**
 * Blog section layout — nested layout for /blog/* routes.
 * Wraps all pages inside src/pages/blog/ with a sidebar/header.
 *
 * This is itself wrapped by the root layout (src/layout.jsx),
 * so you get: RootLayout > BlogLayout > Page
 */
export default function TestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "blue", padding: "1rem" }}>
      <h2>Test Layout</h2>
      {children}
    </div>
  );
}
