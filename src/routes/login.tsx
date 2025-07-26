import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/components/login-form";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

async function handleGitHubSignIn(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const clientID = import.meta.env.VITE_GITHUB_CLIENT_ID;
  const redirectURI = import.meta.env.VITE_GITHUB_REDIRECT_URI;

  const state = window.crypto.randomUUID();
  localStorage.setItem("latestCSRFToken", state);

  const link = `https://github.com/login/oauth/authorize?client_id=${clientID}&response_type=code&scope=repo&redirect_uri=${redirectURI}&state=${state}`;
  window.location.assign(link);
}

function RouteComponent() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <h1 className="font-bold text-xl">
            <span className="text-primary">Beam</span>Sync
          </h1>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm onSubmit={handleGitHubSignIn} />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/beam2.jpg"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
