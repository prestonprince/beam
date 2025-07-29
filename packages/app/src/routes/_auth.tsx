import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  component: RouteComponent,
  beforeLoad: ({ context }) => {
    if (!context.auth.user) {
      throw redirect({
        to: "/login",
      });
    }
  },
});

function RouteComponent() {
  const { auth } = Route.useRouteContext();

  return (
    <div>
      <h1>Authenticated Route</h1>
      <span>Welcome back, {auth.user?.username}</span>
      <Outlet />
    </div>
  );
}
