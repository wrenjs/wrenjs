export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const extractPathname = (path?: string) => {
  if (!path) return undefined;
  let start = 0;
  let end = path.indexOf("?");
  if (end === -1) end = path.length;
  const hash = path.indexOf("#");
  if (hash !== -1 && hash < end) end = hash;
  if (path[0] !== "/") {
    const scheme = path.indexOf("://");
    if (scheme !== -1 && scheme < end) {
      const slash = path.indexOf("/", scheme + 3);
      start = slash !== -1 && slash < end ? slash : end;
    }
  }
  while (end > start + 1 && path[end - 1] === "/") end--;
  const pathname = path.slice(start, end);
  return pathname[0] === "/" ? pathname : `/${pathname}`;
};
