import type { RouteLoader } from "wrenjs/runtime/types";

export const loader: RouteLoader<Record<string, string> | undefined> = async ({ params }) => params;

export default function TestPage({ data }: { data?: { test: string } }) {
  return (
    <main>
      <h1>Specific page in thing {data?.test}</h1>
    </main>
  );
}
