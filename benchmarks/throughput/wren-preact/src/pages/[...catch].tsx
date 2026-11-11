export default function CatchPage({ params }: { params: { catch: string[] } }) {
  return <div>{params.catch}</div>;
}
