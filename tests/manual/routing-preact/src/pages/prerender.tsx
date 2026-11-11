export default function Prerender() {
	return <div>Prerender Page</div>;
}

export const config: Wren.Config = {
	prerender: true,
};
