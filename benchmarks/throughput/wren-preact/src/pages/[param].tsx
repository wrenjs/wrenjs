export default function ParamPage({ params }: { params: { param: string } }) {
  return <div>{params.param}</div>;
}
