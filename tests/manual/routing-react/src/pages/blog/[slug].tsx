/**
 * Dynamic blog post page — [slug] is a route parameter.
 * Demonstrates nested layouts + dynamic routing.
 * Route params reach the page through the server-only loader.
 */

export default function BlogPostPage({ params }: { params?: { slug: string } }) {
  return (
    <article>
      <h1>Post: {params?.slug}</h1>
      <p>This is the blog post with slug "{params?.slug}".</p>
      <p>The BlogLayout wraps this page, and the RootLayout wraps that.</p>
    </article>
  );
}

// Enumerates the slugs prerendered at build time.
export function getStaticPaths() {
  return [{ params: { slug: "hello-world" } }, { params: { slug: "second-post" } }];
}
