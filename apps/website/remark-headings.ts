import type { Heading } from "./src/pages/docs/__layout-nav";

interface MarkdownNode {
  attributes?: { name?: string; type: string; value?: unknown }[];
  children?: MarkdownNode[];
  data?: { hProperties?: Record<string, unknown> };
  depth?: number;
  name?: null | string;
  type: string;
  value?: string;
}

export const remarkHeadings = function (this: { parse(value: string): MarkdownNode }) {
  return (tree: MarkdownNode & { children: MarkdownNode[] }) => {
    const ids = new Set(["docs-content"]);
    const entries: { depth: Heading["depth"]; node: MarkdownNode }[] = [];
    const headings: Heading[] = [];
    visit(tree, (node) => {
      const id = readAttribute(node, "id");
      if (typeof id === "string") ids.add(id);
      const depth =
        node.type === "heading" ? node.depth : Number(node.name?.match(/^h([23])$/)?.[1]);
      if (depth === 2 || depth === 3) entries.push({ depth, node });
    });
    for (const { depth, node } of entries) {
      const label = readText(node).replace(/\s+/g, " ").trim();
      if (!label) continue;
      const existing = readAttribute(node, "id");
      if (existing !== undefined && typeof existing !== "string") {
        throw new Error(`Documentation heading "${label}" must use a static string ID`);
      }
      let id = existing;
      if (!id) {
        const slug =
          label
            .normalize("NFKD")
            .replace(/\p{Diacritic}/gu, "")
            .toLowerCase()
            .match(/[\p{L}\p{N}]+/gu)
            ?.join("-") || "section";
        id = slug;
        let suffix = 1;
        while (ids.has(id)) id = `${slug}-${suffix++}`;
      }
      ids.add(id);
      if (node.attributes) {
        node.attributes = node.attributes.filter(
          (attribute) =>
            attribute.type !== "mdxJsxAttribute" ||
            (attribute.name !== "id" && attribute.name !== "tabIndex"),
        );
        node.attributes.push(
          { name: "id", type: "mdxJsxAttribute", value: id },
          { name: "tabIndex", type: "mdxJsxAttribute", value: "-1" },
        );
      } else {
        node.data ??= {};
        node.data.hProperties = { ...node.data.hProperties, id, tabIndex: -1 };
      }
      headings.push({ depth, id, label });
    }
    const exported = this.parse(`export const headings = ${JSON.stringify(headings)}`);
    if (exported.type !== "root" || !exported.children) {
      throw new Error("MDX parser did not return a document");
    }
    tree.children.push(...exported.children);
  };
};

function readAttribute(node: MarkdownNode, name: string) {
  if (!node.attributes) {
    return node.data?.hProperties?.[name === "aria-hidden" ? "ariaHidden" : name];
  }
  const attribute = node.attributes.find(
    (entry) => entry.type === "mdxJsxAttribute" && entry.name === name,
  );
  return attribute?.value;
}

function readText(node: MarkdownNode): string {
  const hidden = readAttribute(node, "aria-hidden");
  if (
    hidden === true ||
    hidden === "true" ||
    node.name === "wren-glass" ||
    node.name === "script"
  ) {
    return "";
  }
  if (node.type === "text" || node.type === "inlineCode") {
    if (typeof node.value !== "string") throw new Error("MDX text node is missing its value");
    return node.value;
  }
  return node.children?.map(readText).join("") ?? "";
}

function visit(node: MarkdownNode, callback: (node: MarkdownNode) => void) {
  callback(node);
  for (const child of node.children ?? []) visit(child, callback);
}
