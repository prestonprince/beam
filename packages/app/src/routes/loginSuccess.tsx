import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";

const loginSearchSchema = z.object({
  state: z.string(),
  code: z.string(),
});

export const Route = createFileRoute("/loginSuccess")({
  component: RouteComponent,
  validateSearch: loginSearchSchema,
  beforeLoad: async () => {
    // TODO: on success, redirect to authenticated dashboard
  },
});

function RouteComponent() {
  return <div>Hello login success</div>;
}
