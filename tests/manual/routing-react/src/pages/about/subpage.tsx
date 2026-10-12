/**
 * About page — a prerendered (SSG) Server Component.
 *
 * The `config` export tells the framework to render this page to
 * static HTML at build time via `prerender.js`.
 */
export const config = { prerender: true };

export default function AboutPage() {
  return (
    <main>
      <h1>About - Subpage</h1>
      <nav>
        <a href="/">← Back Home</a>
      </nav>
    </main>
  );
}
