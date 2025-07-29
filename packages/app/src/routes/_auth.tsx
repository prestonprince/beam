import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  component: RouteComponent,
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated()) {
      throw redirect({
        to: "/login",
      });
    }
  },
});

function RouteComponent() {
  const { auth } = Route.useRouteContext();
  const currentUser = auth.getCurrentUser();

  return (
    <div>
      <h1>Authenticated Route</h1>
      <span>Welcome back, {currentUser?.username}</span>
      <Outlet />
    </div>
  );
}
