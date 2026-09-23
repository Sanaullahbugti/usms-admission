import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

function loadLocalEnv(path: string) {
  if (existsSync(path)) {
    process.loadEnvFile(path);
  }
}

loadLocalEnv(resolve(import.meta.dirname, "../.env"));
loadLocalEnv(resolve(import.meta.dirname, "../../.env"));
loadLocalEnv(resolve(process.cwd(), ".env"));

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  JWT_SECRET: z.string().min(32),
  COOKIE_SECURE: z
    .string()
    .default("false")
    .transform((value) => value === "true"),
});

export const env = schema.parse(process.env);
