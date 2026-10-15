declare module "virtual:wrenjs-link-client" {
  export const kind: "document" | "flight" | "native";
  export function render(response: Response, signal: AbortSignal): Promise<void>;
}

declare module "virtual:wrenjs-link-script" {
  const url: string;
  export default url;
}
