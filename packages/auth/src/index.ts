import { issuer } from "@openauthjs/openauth";
import { GithubProvider } from "@openauthjs/openauth/provider/github";
import { object, string } from "valibot";
import type { Theme } from "@openauthjs/openauth/ui/theme";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";

const BEAM_THEME: Theme = {
  primary: "#ff2056",
  background: "#09090b",
  title: "Beam",
};

interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  KV: KVNamespace;
}

const subjects = {
  user: object({
    userID: string(),
    login: string(),
    name: string(),
    email: string(),
    avatar_url: string(),
  }),
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const app = issuer({
      theme: BEAM_THEME,
      providers: {
        github: GithubProvider({
          clientID: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
          scopes: ["user:email"],
        }),
      },
      subjects,
      storage: CloudflareStorage({
        namespace: env.KV,
      }),
      success: async (ctx, value) => {
        if (value.provider === "github") {
          console.log(value);
          const userResponse = await fetch("https://api.github.com/user", {
            headers: {
              Authorization: `Bearer ${value.tokenset.access}`,
              "User-Agent": "Beam-Auth",
            },
          });

          const user = (await userResponse.json()) as {
            id: number;
            login: string;
            name: string;
            email: string;
            avatar_url: string;
          };

          console.log({ user });

          return ctx.subject("user", {
            userID: user.id.toString(),
            login: user.login,
            name: user.name || "",
            email: user.email || "",
            avatar_url: user.avatar_url || "",
          });
        }

        throw new Error("Unknown provider");
      },
    });

    return app.fetch(request, env);
  },
};
