// import Link from "@wrenjs/react/link";
import type { RouteLoader } from "wrenjs/runtime/types";
/**
 * Home page — Server Component (default, no directive needed).
 * This code runs ONLY on the server and never ships to the client.
 */
import { getServerCount, getServerTime } from "../actions/demo.ts";
import { Counter } from "../components/Counter.tsx";

export const loader: RouteLoader = async ({ request }) => ({
  headers: request.headers.get("accept"),
  method: request.method,
  url: request.url,
});

export default async function HomePage({ data }: { data?: unknown }) {
  // You can do server-only things here: read files, query a DB, etc.
  const serverTimestamp = await getServerTime();
  const serverCount = await getServerCount();
  const [res] = await data;
  return (
    <main>
      <h1>Home</h1>
      <p>Server-rendered at: {serverTimestamp}</p>
      <Counter count={serverCount} />
      <nav>
        <ul>
          <li>
            <a href="/about">About (prerendered/SSG)</a>
          </li>
          <li>
            <a href="/blog">Blog (nested layout demo)</a>
          </li>
          <li>
            <a href="/contact">Contact</a>
          </li>
          <li>
            <a href="/arbitrary/path">Arbitrary Path</a>
          </li>
          <li>
            <a href="/group-1">Group 1 a</a>
          </li>
          <li>
            <a href="/group-2">Group 2 a</a>
          </li>
        </ul>
      </nav>
      <pre>{JSON.stringify(res, null, 2)}</pre>
      <p id="page-script-target">page script pending…</p>
      <script src="../scripts/hello.ts" type="module" />
      <script type="module">{`console.log("inline page script");`}</script>
    </main>
  );
}
