type CatchAllPageProps = {
  params: Promise<{
    catchall: string[];
  }>;
};

export default async function CatchAll({ params }: CatchAllPageProps) {
  const { catchall } = await params;
  return <div>{catchall.join(", ")}</div>;
}
