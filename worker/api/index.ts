// import { DurableObject } from "cloudflare:workers";
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.text("Hello world"));

export default app;

// export class UserStorage extends DurableObject {
//   private state: DurableObjectState;

//   constructor(state: DurableObjectState, env) {
//     super(state, env);
//   }
// }
