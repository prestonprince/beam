import { createFileRoute, redirect } from "@tanstack/react-router";
import z from "zod";

const searchSchema = z.object({
  state: z.string(),
  code: z.string(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/loginSuccess")({
  component: RouteComponent,
  validateSearch: searchSchema,
  beforeLoad: async ({ search, context }) => {
    const isSuccess = await context.auth.callback({
      state: search.state,
      code: search.code,
    });
    if (!isSuccess) {
      throw redirect({
        to: "/login",
      });
    }

    throw redirect({
      to: "/dashboard",
    });
  },
});

function RouteComponent() {
  return <div>success!</div>;
}
