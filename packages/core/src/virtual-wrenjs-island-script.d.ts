declare module "virtual:wrenjs-island-script" {
	// Undefined in builds that never bundle the script.
	const url: string | undefined;
	export default url;
}
