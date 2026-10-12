export function GET(_request: Request, params: { params: string }) {
  return new Response(`Hello from params api! Params: ${params.params}`, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
