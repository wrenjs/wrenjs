export const loader: Wren.Loader = async ({ params }) => params;

export default function TestPage({ data }: { data?: { test: string } }) {
	return (
		<main>
			<h1>Specific page in thing {data?.test}</h1>
		</main>
	);
}
