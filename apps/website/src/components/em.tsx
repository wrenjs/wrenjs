import type { ComponentChildren } from "preact";

export function Em({ children }: { children: ComponentChildren }) {
	return <em class=":uno: font-accent text-gray-400">{children}</em>;
}
