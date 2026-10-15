import type { ComponentChildren } from "preact";
import Link from "@wren-js/core/link";
import { Glass } from "./glass";

export function CTA(props: { children?: ComponentChildren; href: string }) {
  return (
    <Glass class=":uno: block max-w-max rounded-full">
      <Link
        class=":uno: inline-flex gap-1.5 items-center rounded-full font-semibold text-black px-5 py-2 [&>i]:mb-1"
        href={props.href}
      >
        {props.children}
      </Link>
    </Glass>
  );
}
