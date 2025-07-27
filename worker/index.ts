// import { DurableObject } from "cloudflare:workers";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

type Bindings = {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_REDIRECT_URI: string;
};

const app = new Hono<{ Bindings: Bindings }>();
app.use(logger());
app.use(
  "*",
  cors({
    origin: ["https://beamsync.app", "http://localhost:5173"],
  }),
);

const appRouter = app
  .get("/api/health", (c) => c.json({ message: "OK" }, 200))
  .post(
    "/api/oauth/access_token",
    zValidator(
      "json",
      z.object({
        code: z.string(),
      }),
    ),
    async (c) => {
      const { code } = c.req.valid("json");

      const res = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: c.env.GITHUB_CLIENT_ID,
          client_secret: c.env.GITHUB_CLIENT_SECRET,
          redirect_uri: c.env.GITHUB_REDIRECT_URI,
          code,
        }),
      });
      if (!res.ok) {
        throw new Error(`GitHub OAuth error: ${res.status} ${res.statusText}`);
      }

      // TODO: Set up Durable Object DB per User on github id?
      // use access_token to get github user id and use for DO

      return c.text("OK");
    },
  );

export type AppRouter = typeof appRouter;

export default app;

// export class UserStorage extends DurableObject {
//   private state: DurableObjectState;

//   constructor(state: DurableObjectState, env) {
//     super(state, env);
//   }
// }
