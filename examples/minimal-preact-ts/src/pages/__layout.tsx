import type { ComponentChildren } from "preact";

export default function Layout({ children }: { children: ComponentChildren }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
