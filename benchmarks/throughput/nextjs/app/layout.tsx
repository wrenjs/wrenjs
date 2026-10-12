import type { ReactNode } from "react";

// Ensure routes are all server-rendered to match
// other frameworks in this benchmark.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
