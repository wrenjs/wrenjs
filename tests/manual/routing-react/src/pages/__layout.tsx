import type { RouteLoader } from "wrenjs/types";
import { Counter } from "../components/Counter.tsx";

export const loader: RouteLoader = async () => ({
  testData: "example",
});

export default async function RootLayout({
  children,
  data,
}: {
  children: React.ReactNode;
  data?: unknown;
}) {
  const [, resolved] = await data;
  return (
    <html className="egg" lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <title>wren</title>
      </head>
      <body>
        <a href="/">Home</a>
        Shared Counter:
        <Counter />
        Shared Layout Data: {JSON.stringify(resolved, null, 2)}
        {children}
      </body>
    </html>
  );
}
