import type { Entry } from "#/types.js";
import { createNode, type RadixTrie } from "#/runtime/router/trie-lookup.ts";

/** `:a-:b.json` → ["", "-", ".json"], consuming `names[i..]` in order. */
const mixedSegment = (seg: string, names: string[], i: number) => {
  const lits: string[] = [];
  let rest = seg;
  let n = i;
  for (; n < names.length; n++) {
    const at = rest.indexOf(`:${names[n]}`);
    if (at < 0) break;
    lits.push(rest.slice(0, at));
    rest = rest.slice(at + names[n].length + 1);
  }
  lits.push(rest);
  return { i: n, lits };
};

const insert = (root: RadixTrie, pattern: string, entry: Entry) => {
  const names = entry.params!;
  const segs = pattern.split("/").filter(Boolean);
  const key = segs.at(-1) === `:${names.at(-1)}*` ? "w" : "e";
  if (key === "w") segs.pop();

  let node = root;
  let i = 0;
  for (const seg of segs) {
    if (!seg.includes(":")) {
      node.s[seg] ??= createNode();
      node = node.s[seg];
    } else if (seg === `:${names[i]}`) {
      node.p ??= createNode();
      node = node.p;
      i++;
    } else if (seg.endsWith("*")) {
      throw new Error(`Catch-all must be last in "${pattern}".`);
    } else {
      const mixed = mixedSegment(seg, names, i);
      if (mixed.i === i) throw new Error(`Params do not match pattern "${pattern}".`);
      const child = createNode();
      node.m ??= [];
      node.m.push({ lits: mixed.lits, node: child });
      node = child;
      i = mixed.i;
    }
  }

  if (i !== names.length - (key === "w" ? 1 : 0)) {
    throw new Error(`Params do not match pattern "${pattern}".`);
  }
  const existing = node[key];
  if (existing) throw new Error(`"${entry.file}" conflicts with "${existing.file}".`);
  node[key] = entry;
};

/**
 * Build a segment trie from pattern-keyed routes (`:name`, `:name*`, and mixed
 * segments like `:a-:b`). Param names are not stored on edges, so `/users/:id`
 * and `/users/:name/settings` share one param edge.
 */
export const createRadixTrie = (routes: Record<string, Entry> = {}): RadixTrie => {
  const root = createNode();
  for (const [pattern, entry] of Object.entries(routes)) insert(root, pattern, entry);
  return root;
};
