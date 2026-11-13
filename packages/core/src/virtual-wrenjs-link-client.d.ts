declare module "virtual:wrenjs-link-client" {
	export const kind: "document" | "flight";
	export function render(response: Response, signal: AbortSignal): Promise<void>;
}

declare module "virtual:wrenjs-link-script" {
	// Undefined in builds that never bundle the script.
	const url: string | undefined;
	export default url;
}
