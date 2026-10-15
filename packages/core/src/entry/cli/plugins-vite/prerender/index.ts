import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { PrerenderArtifact, PrerenderRuntime } from "#/types.js";
import { extractPathname } from "#shared/utils.ts";
import { inlineStylesheets } from "./inline-css.ts";

export const prerenderRoutes = async (
  runtimes: PrerenderRuntime[],
  outDir: string,
  origin = "http://localhost",
  prerenderAll = false,
  styles: ReadonlyMap<string, string> = new Map(),
): Promise<number> => {
  const base = new URL(origin);
  if (!/^https?:$/.test(base.protocol) || base.href !== `${base.origin}/`) {
    throw new Error("build.prerender.origin must be an HTTP(S) origin.");
  }
  const pathnames = new Set<string>();
  const files = new Set<string>();
  const capture = async ({ pathname: path, response }: PrerenderArtifact) => {
    const pathname = extractPathname(path)!;
    if (response.status !== 200)
      throw new Error(`Cannot prerender ${pathname}: HTTP ${response.status}.`);
    const isHtml = response.headers.get("content-type")?.startsWith("text/html");
    const file = isHtml ? join(pathname.slice(1), "index.html") : pathname.slice(1);
    if (pathnames.has(pathname) || files.has(file)) {
      throw new Error(`Conflicting prerender artifact: ${pathname}.`);
    }
    pathnames.add(pathname);
    files.add(file);
    const destination = join(outDir, file);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(
      destination,
      isHtml && styles.size > 0
        ? inlineStylesheets(await response.text(), styles)
        : new Uint8Array(await response.arrayBuffer()),
    );
  };
  let pages = 0;
  await Promise.all(
    runtimes.map(async (runtime) => {
      const paths = await runtime.getPaths(prerenderAll);
      await Promise.all(
        paths.map(async (path) => {
          const pathname = extractPathname(path)!;
          if (pathnames.has(pathname))
            throw new Error(`Multiple prerender providers claim ${pathname}.`);
          const artifacts = await runtime.render(new Request(new URL(pathname, base)));
          await Promise.all(artifacts.map(capture));
          if (!pathnames.has(pathname)) {
            throw new Error(`Prerender renderer did not return ${pathname}.`);
          }
          pages++;
        }),
      );
    }),
  );
  return pages;
};
