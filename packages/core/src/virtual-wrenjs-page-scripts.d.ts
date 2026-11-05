declare module "virtual:wrenjs-page-scripts" {
	const manifest: {
		imports?: Record<string, string[]>;
		routes: Record<string, string[]>;
		scripts: Record<string, string>;
	};
	export default manifest;
}

declare module "virtual:wrenjs-hoist:*" {}
