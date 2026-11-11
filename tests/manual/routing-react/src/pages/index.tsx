import Link from "@wrenjs/core/link";
/**
 * Home page — Server Component (default, no directive needed).
 * This code runs ONLY on the server and never ships to the client.
 */
import { getServerCount, getServerTime } from "../actions/demo";
import { Counter } from "../components/Counter";

export const loader: Wren.Loader = async ({ request }) => ({
	headers: request.headers.get("accept"),
	method: request.method,
	url: request.url,
});

export default async function HomePage({
	data,
}: {
	data?: Promise<[Parameters<typeof getServerTime>]>;
}) {
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
						<Link href="/about">About (prerendered/SSG)</Link>
					</li>
					<li>
						<Link href="/blog">Blog (nested layout demo)</Link>
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
		</main>
	);
}
