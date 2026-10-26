import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { PrerenderArtifact, PrerenderRuntime } from "#/types.js";
import { forEachLimit } from "#shared/cli/utils.ts";
import { extractPathname } from "#shared/utils.ts";
import { inlineStylesheets } from "./inline-css.ts";

const PRERENDER_CONCURRENCY = 32;

// Static hosts look files up by decoded path. A segment that would decode into a separator or a
// dot segment stays encoded instead of escaping its directory.
const UNSAFE_SEGMENT_RE = /[/\\]|^\.\.?$/;

const decodeSegment = (segment: string) => {
  try {
    const decoded = decodeURIComponent(segment);
    return UNSAFE_SEGMENT_RE.test(decoded) ? segment : decoded;
  } catch {
    return segment;
  }
};

const toFilePath = (pathname: string) => pathname.slice(1).split("/").map(decodeSegment).join("/");

// Paths are compared and requested the way browsers send them: percent-encoded.
const toPathname = (path: string, base: URL) => {
  const url = new URL(extractPathname(path) ?? "/", base);
  if (url.origin !== base.origin) throw new Error(`Invalid prerender path: ${path}.`);
  return extractPathname(url.pathname)!;
};

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
    const file = isHtml ? join(toFilePath(pathname), "index.html") : toFilePath(pathname);
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
  const provided = await Promise.all(
    runtimes.map(async (runtime) => [runtime, await runtime.getPaths(prerenderAll)] as const),
  );
  const claims = new Map<string, PrerenderRuntime>();
  for (const [runtime, paths] of provided) {
    for (const path of paths) {
      const pathname = toPathname(path, base);
      if ((claims.get(pathname) ?? runtime) !== runtime) {
        throw new Error(`Multiple prerender providers claim ${pathname}.`);
      }
      claims.set(pathname, runtime);
    }
  }
  let pages = 0;
  await forEachLimit([...claims], PRERENDER_CONCURRENCY, async ([pathname, runtime]) => {
    const artifacts = await runtime.render(new Request(new URL(pathname, base)));
    await Promise.all(artifacts.map(capture));
    if (!pathnames.has(pathname)) {
      throw new Error(`Prerender renderer did not return ${pathname}.`);
    }
    pages++;
  });
  return pages;
};
