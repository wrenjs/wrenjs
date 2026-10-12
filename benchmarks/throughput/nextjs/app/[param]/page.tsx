export default async function Param({ params }: { params: Promise<{ param: string }> }) {
  const { param } = await params;
  return <div>{param}</div>;
}
