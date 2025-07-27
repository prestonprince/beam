import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { client } from "@/lib/api";

const loginSearchSchema = z.object({
  state: z.string(),
  code: z.string(),
});

export const Route = createFileRoute("/loginSuccess")({
  component: RouteComponent,
  validateSearch: loginSearchSchema,
  beforeLoad: async ({ search }) => {
    // TODO: on success, redirect to authenticated dashboard
  },
});

function RouteComponent() {
  return <div>Hello login success</div>;
}
