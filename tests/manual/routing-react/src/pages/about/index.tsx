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
      <h1>About</h1>
      <p>This is a minimal RSC framework built with Vite + Elysia.</p>
      <p>This page was statically prerendered at build time.</p>
      <nav>
        <a href="/">← Back Home</a>
        <a href="/about/subpage">Go to subpage →</a>
      </nav>
    </main>
  );
}
