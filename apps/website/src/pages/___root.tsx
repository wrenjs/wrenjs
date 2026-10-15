import "virtual:uno.css";
import "./___root.css";

import { LS_PKG_KEY, LS_THEME_KEY } from "#/constants";

export default function RootLayout({ children }: { children: JSX.Children }) {
  return (
    <html class=":uno: bg-bg" lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <title>Wren - Lightweight Meta Framework</title>
        <link
          as="font"
          crossOrigin="anonymous"
          fetchpriority="high"
          href="/font/miranda-sans.woff2"
          rel="preload"
          type="font/woff2"
        />
        <script>
          {`var pm=localStorage.getItem("${LS_PKG_KEY}")||'';var t=localStorage.getItem("${LS_THEME_KEY}")||'light';document.documentElement.dataset["${LS_PKG_KEY}"]=pm;document.documentElement.dataset["${LS_THEME_KEY}"]=t`}
        </script>
      </head>
      <body class=":uno: bg-bg">{children}</body>
    </html>
  );
}
