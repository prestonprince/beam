import { Hono } from "hono";
import { cors } from "hono/cors";

import { env } from "./lib/env";
import { authRouter } from "./auth/routes";
import { JWTPayload } from "./lib/types";
import { logger } from "hono/logger";

type Variables = {
  jwtPayload: JWTPayload;
};

const app = new Hono<{ Variables: Variables }>();
app.use(logger());
app.use(
  "*",
  cors({
    origin: "*",
  }),
);

const appRouter = app
  .get("/api/health", (c) => c.json({ message: "OK" }))
  .route("/api/auth", authRouter);

export type AppRouter = typeof appRouter;

export default {
  port: 3001,
  fetch: app.fetch,
};
