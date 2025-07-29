import { HTTPException } from "hono/http-exception";

import { toQueryParams } from "../lib/objectToQuery";
import { env } from "../lib/env";
import { GitHubErrorResponse, GitHubTokenResponse } from "./types";

const userAgent = "Hono-Auth-App";

export async function exchangeCodeForToken(code: string) {
  const response = (await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    body: JSON.stringify({
      code,
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
    }),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  }).then((res) => res.json())) as GitHubTokenResponse | GitHubErrorResponse;

  if ("error_description" in response) {
    throw new HTTPException(400, { message: response.error_description });
  }

  return response.access_token;
}

export function buildGithubLoginUrl(state: string) {
  const url = "https://github.com/login/oauth/authorize?";
  const queryParams = toQueryParams({
    state,
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
    scope: ["repo", "user", "user:email"],
    redirect_uri: env.GITHUB_REDIRECT_URI,
  });

  return url.concat(queryParams);
}
