// import { DurableObject } from "cloudflare:workers";
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: ["https://beamsync.app", "http://localhost:5173"],
  }),
);

const appRouter = app.get("/api/health", (c) => c.json({ message: "OK" }, 200));

export type AppRouter = typeof appRouter;

export default app;

// export class UserStorage extends DurableObject {
//   private state: DurableObjectState;

//   constructor(state: DurableObjectState, env) {
//     super(state, env);
//   }
// }
