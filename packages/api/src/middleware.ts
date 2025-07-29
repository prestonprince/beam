import { jwt } from "hono/jwt";
import { env } from "./lib/env";

export function authRequired() {
  return jwt({
    secret: env.JWT_SECRET,
  });
}
