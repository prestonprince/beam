import { hc } from "hono/client";
import type { AppRouter } from "@beam/api";

export const client = hc<AppRouter>("http://localhost:3001");

export async function getHealth() {
  const res = await client.api.health.$get();
  if (res.ok) {
    const data = await res.json();
    return data.message;
  }

  return "Not ok";
}
