export interface Edit {
  end: number;
  start: number;
  text: string;
}

export const countLines = (text: string): number => {
  let count = 0;
  for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) count++;
  return count;
};

export const replaceLines = (code: string, start: number, end: number, text: string): Edit => {
  const padding = countLines(code.slice(start, end)) - countLines(text);
  return { end, start, text: padding > 0 ? text + "\n".repeat(padding) : text };
};

export const applyEdits = (code: string, edits: Edit[]): string => {
  let result = "";
  let index = 0;
  for (const { end, start, text } of edits.toSorted((a, b) => a.start - b.start)) {
    result += code.slice(index, start) + text;
    index = end;
  }
  return result + code.slice(index);
};
