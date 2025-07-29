import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import jwt from "jsonwebtoken";
import { Octokit } from "@octokit/rest";

import { GitHub } from "@beam/core";
import { buildGithubLoginUrl, exchangeCodeForToken } from "./github";
import { env } from "../lib/env";

// TODO: replace with redis?
const stateMap = new Map<string, string>();

export const authRouter = new Hono()
  .get("/github", (c) => {
    const stateId = uuid();
    const state = uuid();
    stateMap.set(stateId, state);

    const url = buildGithubLoginUrl(state);
    return c.json({ url, stateId });
  })
  .post(
    "/github/callback",
    zValidator(
      "json",
      z.object({
        code: z.string(),
        state: z.string(),
        stateId: z.string(),
      }),
    ),
    async (c) => {
      const { code, state, stateId } = c.req.valid("json");
      if (state !== stateMap.get(stateId)) {
        throw new HTTPException(401);
      }

      const accessToken = await exchangeCodeForToken(code);

      const tempOctokit = new Octokit({ auth: accessToken });
      const [userInfo, userEmail] = await Promise.all([
        GitHub.users.getProfile({ octokit: tempOctokit }),
        GitHub.users.getEmail({ octokit: tempOctokit }),
      ]);

      const token = jwt.sign(
        {
          userId: userInfo.id,
          email: userEmail,
          username: userInfo.login,
          accessToken: accessToken,
        },
        env.JWT_SECRET,
        { expiresIn: "7d", algorithm: "HS256" },
      );

      return c.json({ jwt: token });
    },
  );
