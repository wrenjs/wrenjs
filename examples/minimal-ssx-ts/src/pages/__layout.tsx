export default function Layout({ children }: { children: JSX.Children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
