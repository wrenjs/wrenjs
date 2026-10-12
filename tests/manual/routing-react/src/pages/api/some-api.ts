export function GET(request: Request) {
  console.info("Received GET request at /api/some-api", request);
  return new Response("Hello from some-api!");
}
