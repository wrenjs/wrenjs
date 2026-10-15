export default function Group1SubgroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: "4px solid green", padding: "1rem" }}>
      <h1>Group 1 Subgroup Layout</h1>
      <p>This is the layout for Group 1 Subgroup.</p>
      {children}
    </div>
  );
}
