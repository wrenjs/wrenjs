import type { ESTree } from "vite";
import { parseSync, Visitor } from "vite";
import { SOURCE_RE } from "#shared/constants.ts";

export interface InlinePageScript extends PageScriptBase {
  code: string;

  codeStart: number;

  index: number;
  kind: "inline";
}

export type PageScript = InlinePageScript | SrcPageScript;

export interface PageScripts {
  scripts: PageScript[];
  warnings: string[];
}

export interface SrcPageScript extends PageScriptBase {
  kind: "src";
  src: string;
}

interface PageScriptBase {
  attributes: string[];
  end: number;

  replacement: string;
  start: number;
}

interface ScriptAttributes {
  html?: ESTree.JSXAttribute;
  kept: string[];
  src?: ESTree.JSXAttribute;
  type?: string;
}

type StaticCode = [code: string, start: number];

const URL_RE = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;

const staticString = (node: ESTree.JSXExpression): string | undefined => {
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? undefined;
  }
  return undefined;
};

const attributeString = ({ value }: ESTree.JSXAttribute): string | undefined => {
  if (value?.type === "Literal") return value.value;
  if (value?.type === "JSXExpressionContainer") return staticString(value.expression);
  return undefined;
};

const partitionAttributes = (code: string, element: ESTree.JSXOpeningElement) => {
  const result: ScriptAttributes = { kept: [] };
  for (const attribute of element.attributes) {
    const text = code.slice(attribute.start, attribute.end);
    if (attribute.type !== "JSXAttribute" || attribute.name.type !== "JSXIdentifier") {
      result.kept.push(text);
      continue;
    }
    const { name } = attribute.name;
    if (name === "src") result.src = attribute;
    else if (name === "dangerouslySetInnerHTML") result.html = attribute;
    else {
      if (name === "type") result.type = attributeString(attribute);
      result.kept.push(text);
    }
  }
  return result;
};

const propertyName = ({ key }: ESTree.ObjectProperty) => {
  if (key.type === "Identifier") return key.name;
  return key.type === "Literal" ? key.value : null;
};

const innerHtml = ({ value }: ESTree.JSXAttribute): StaticCode | undefined => {
  const expression = value?.type === "JSXExpressionContainer" ? value.expression : undefined;
  if (expression?.type !== "ObjectExpression") return undefined;
  for (const property of expression.properties) {
    if (property.type !== "Property" || property.computed) continue;
    if (propertyName(property) !== "__html") continue;
    const code = staticString(property.value);
    return code === undefined ? undefined : [code, property.value.start + 1];
  }
  return undefined;
};

const inlineCode = (
  element: ESTree.JSXElement,
  html: ESTree.JSXAttribute | undefined,
): StaticCode | undefined => {
  if (html) return innerHtml(html);
  const children = element.children.filter(
    (child) => !(child.type === "JSXText" && child.value.trim() === ""),
  );
  if (children.length === 0) return ["", element.start];
  if (children.length !== 1) return undefined;
  const [child] = children;
  if (child.type === "JSXText") return [child.value, child.start];
  if (child.type !== "JSXExpressionContainer") return undefined;
  const code = staticString(child.expression);
  return code === undefined ? undefined : [code, child.expression.start + 1];
};

const isScriptElement = ({ name }: ESTree.JSXOpeningElement) =>
  name.type === "JSXIdentifier" && name.name === "script";

export const extractPageScripts = (code: string, filename: string): PageScripts => {
  const scripts: PageScript[] = [];
  const warnings: string[] = [];
  const { errors, program } = parseSync(filename, code);

  if (errors.length > 0) return { scripts, warnings };

  let inlineIndex = 0;

  const children = new Set<number>();
  const markChildren = (parent: ESTree.JSXElement | ESTree.JSXFragment) => {
    for (const child of parent.children) children.add(child.start);
  };
  const visitScript = (element: ESTree.JSXElement) => {
    const { html, kept, src, type } = partitionAttributes(code, element.openingElement);
    const srcValue = src && attributeString(src);
    const isLocalSrc = srcValue !== undefined && !URL_RE.test(srcValue);

    if (type !== "module") {
      if (isLocalSrc && SOURCE_RE.test(srcValue)) {
        warnings.push(
          `<script src="${srcValue}"> is not bundled; add type="module" to make it a page script.`,
        );
      }
      return;
    }

    const base = {
      attributes: kept,
      end: element.end,
      replacement: children.has(element.start) ? "" : "<></>",
      start: element.start,
    };
    if (src) {
      if (isLocalSrc) scripts.push({ ...base, kind: "src", src: srcValue });
      return;
    }
    const inline = inlineCode(element, html);
    if (!inline) {
      warnings.push(`<script type="module"> content must be a static string to be bundled.`);
      return;
    }
    const [content, codeStart] = inline;
    if (content.trim() === "") return;
    scripts.push({ ...base, code: content, codeStart, index: inlineIndex++, kind: "inline" });
  };

  new Visitor({
    JSXElement(element) {
      markChildren(element);
      if (isScriptElement(element.openingElement)) visitScript(element);
    },
    JSXFragment: markChildren,
  }).visit(program);
  return { scripts, warnings };
};
