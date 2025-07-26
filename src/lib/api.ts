import type { AppRouter } from "worker/api";
import { hc } from "hono/client";

const client = hc<AppRouter>("http://localhost:1337");

export async function getHealth() {
  const res = await client.api.health.$get();
  if (res.ok) {
    const data = await res.json();
    return data.message;
  }

  return "Not ok";
}
