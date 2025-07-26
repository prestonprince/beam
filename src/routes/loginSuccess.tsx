import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";

const loginSearchSchema = z.object({
  state: z.string(),
  code: z.string(),
});

export const Route = createFileRoute("/loginSuccess")({
  component: RouteComponent,
  validateSearch: loginSearchSchema,
  beforeLoad: () => {
    // TODO: add logic to parse state and send code to backend
  },
});

function RouteComponent() {
  return <div>Hello login success</div>;
}
