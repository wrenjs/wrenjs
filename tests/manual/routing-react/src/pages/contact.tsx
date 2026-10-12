/**
 * About page — a prerendered (SSG) Server Component.
 *
 * The `config` export tells the framework to render this page to
 * static HTML at build time via `prerender.js`.
 */
export const config = { prerender: true };

export default function ContactPage() {
  return (
    <main>
      <h1>Contact</h1>
      <nav>
        <a href="/">← Back Home</a>
      </nav>
    </main>
  );
}
