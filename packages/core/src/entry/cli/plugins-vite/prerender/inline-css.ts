import type { Rolldown } from "vite";

const STYLESHEET_RE =
  /<link\b(?=[^>]*\srel="stylesheet")(?![^>]*\s(?:disabled|media)\b)[^>]*\shref="([^"]+)"[^>]*>/gi;
const PRECEDENCE_RE = /\sdata-precedence="[^"]*"/i;
const STYLE_END_RE = /<\/(style)/gi;

export const collectStylesheets = (
  bundle: Rolldown.OutputBundle,
  base: string,
  limit: number,
  styles: Map<string, string>,
): void => {
  for (const output of Object.values(bundle)) {
    if (output.type !== "asset" || !output.fileName.endsWith(".css")) continue;
    const css = Buffer.from(output.source);
    if (css.byteLength < limit) {
      styles.set(base + output.fileName, css.toString().replace(STYLE_END_RE, "<\\/$1"));
    }
  }
};

export const inlineStylesheets = (html: string, styles: ReadonlyMap<string, string>): string => {
  let end = html.indexOf("</head>");
  if (end === -1) end = html.length;
  const inlined = html.slice(0, end).replace(STYLESHEET_RE, (tag: string, href: string) => {
    const css = styles.get(href);
    if (css === undefined) return tag;
    const precedence = PRECEDENCE_RE.exec(tag)?.[0] ?? "";
    const style = `<style data-href="${href}"${precedence}>${css}</style>`;
    return precedence ? `${style}<link disabled type="text/x-inlined"${tag.slice(5)}` : style;
  });
  return inlined + html.slice(end);
};
