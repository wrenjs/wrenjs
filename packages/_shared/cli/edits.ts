/** A source replacement; offsets refer to the original code. */
export interface Edit {
  end: number;
  start: number;
  text: string;
}

export const countLines = (text: string): number => text.split("\n").length - 1;

/** Replaces `[start, end)` with `text`, padded so the following lines keep their numbers. */
export const replaceLines = (code: string, start: number, end: number, text: string): Edit => {
  const padding = countLines(code.slice(start, end)) - countLines(text);
  return { end, start, text: padding > 0 ? text + "\n".repeat(padding) : text };
};

/** Applies non-overlapping edits in one pass; `map: null` is accurate when every edit preserves lines. */
export const applyEdits = (code: string, edits: Edit[]): string => {
  let result = code;
  for (const { end, start, text } of edits.toSorted((a, b) => b.start - a.start)) {
    result = result.slice(0, start) + text + result.slice(end);
  }
  return result;
};
