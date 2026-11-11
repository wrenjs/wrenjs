import type { JSX } from "preact/jsx-runtime";

import "./__layout.css";
import Link from "@wrenjs/core/link";

export default function RootLayout({ children }: { children: JSX.Element }) {
	return (
		<html className="egg" lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta content="width=device-width, initial-scale=1" name="viewport" />
				<title>wren</title>
			</head>
			<body>
				<nav>
					<Link href="/">Home</Link>
					<Link href="/another">Another</Link>
				</nav>
				{children}
			</body>
		</html>
	);
}
