import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async () => {
  return new Response(JSON.stringify({ message: "Hello from API!" }), {
    headers: { "Content-Type": "application/json" },
  });
};
