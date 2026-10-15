import type { RadixTrie } from "#/types.js";

const fitsMixed = (lits: string[], seg: string, values?: string[]): boolean => {
  const last = lits.length - 1;
  if (!seg.startsWith(lits[0]) || !seg.endsWith(lits[last])) return false;
  let pos = lits[0].length;
  for (let k = 1; k < last; k++) {
    const at = seg.indexOf(lits[k], pos + 1);
    if (at < 0) return false;
    values?.push(seg.slice(pos, at));
    pos = at + lits[k].length;
  }
  const end = seg.length - lits[last].length;
  if (end <= pos) return false;
  values?.push(seg.slice(pos, end));
  return true;
};

const matchMixed = <Route>(
  m: NonNullable<RadixTrie<Route>["m"]>,
  seg: string,
  path: string,
  next: number,
  values?: string[],
): Route | undefined => {
  const count = values?.length ?? 0;
  for (const { lits, node } of m) {
    const r = fitsMixed(lits, seg, values) ? match(node, path, next, values) : undefined;
    if (r !== undefined) return r;
    if (values) values.length = count;
  }
  return undefined;
};

const match = <Route>(
  node: RadixTrie<Route>,
  path: string,
  pos: number,
  values?: string[],
): Route | undefined => {
  if (pos >= path.length) return node.e;

  const slash = path.indexOf("/", pos);
  const end = slash < 0 ? path.length : slash;
  const seg = path.slice(pos, end);
  const next = end + 1;

  const curr = node.s;
  const exact = Object.hasOwn(curr, seg) ? match(curr[seg], path, next, values) : undefined;
  if (exact !== undefined) return exact;

  const mixed = node.m && matchMixed(node.m, seg, path, next, values);
  if (mixed !== undefined) return mixed;

  if (node.p && seg) {
    const count = values?.length ?? 0;
    values?.push(seg);
    const r = match(node.p, path, next, values);
    if (r !== undefined) return r;
    if (values) values.length = count;
  }

  if (node.w !== undefined) values?.push(path.slice(pos));
  return node.w;
};

export const trieLookup = <Route>(
  trie: RadixTrie<Route>,
  pathname: string,
  values?: string[],
): Route | undefined => match(trie, pathname, 1, values);
