export default function RootLayout({ children }: { children: JSX.Children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
