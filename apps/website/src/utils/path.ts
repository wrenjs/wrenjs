export function getPagePath(url: string) {
  return new URL(url).pathname.replace(/_\.flt$/, "").replace(/\/$/, "") || "/";
}
