/**
 * Blog index page — a Server Component wrapped by BlogLayout.
 */

export default function BlogIndexPage() {
  return (
    <div>
      <h1>Blog</h1>
      <ul>
        <li>
          <a href="/blog/hello-world">Hello World</a>
        </li>
        <li>
          <a href="/blog/rsc-deep-dive">RSC Deep Dive</a>
        </li>
      </ul>
    </div>
  );
}
