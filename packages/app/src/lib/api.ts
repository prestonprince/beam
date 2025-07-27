import type { AppRouter } from "worker";
import { hc } from "hono/client";

export const client = hc<AppRouter>("http://localhost:5173");

export async function getHealth() {
  const res = await client.api.health.$get();
  if (res.ok) {
    const data = await res.json();
    return data.message;
  }

  return "Not ok";
}
