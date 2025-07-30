import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  JWT_SECRET: z.string(),

  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  GITHUB_REDIRECT_URI: z.url(),

  // POSTGRES_HOST: z.string(),
  // POSTGRES_PORT: z.string().refine((val) => !isNaN(parseInt(val, 10)), {
  //   message: "POSTGRES_PORT must be a valid number",
  // }),
  // POSTGRES_DB: z.string(),
  // POSTGRES_USER: z.string(),
  // POSTGRES_PASSWORD: z.string(),

  NODE_ENV: z.union([z.literal("development"), z.literal("production")]),
});

export const env = envSchema.parse(Bun.env);
