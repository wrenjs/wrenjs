export default function Group2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: "2px solid blue", padding: "1rem" }}>
      <h1>Group 2 Layout</h1>
      <p>This is the layout for Group 2.</p>
      {children}
    </div>
  );
}
