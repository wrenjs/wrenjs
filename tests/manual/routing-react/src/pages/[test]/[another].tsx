export default function TestPage({ params }: { params?: { another: string; test: string } }) {
  return (
    <main>
      <h1>
        Test {params?.test} - {params?.another}
      </h1>
    </main>
  );
}
