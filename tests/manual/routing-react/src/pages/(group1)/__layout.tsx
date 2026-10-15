export default function Group1Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: "2px solid red", padding: "1rem" }}>
      <h1>Group 1 Layout</h1>
      <p>This is the layout for Group 1.</p>
      {children}
    </div>
  );
}
