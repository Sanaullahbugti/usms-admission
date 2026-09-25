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
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: z
    .string()
    .default("true")
    .transform((value) => value === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().min(3).default("admissions@usms.edu.pk"),
  UPLOADS_DIR: z
    .string()
    .default(resolve(import.meta.dirname, "../../storage/uploads")),
  CLIENT_DIST_DIR: z
    .string()
    .default(resolve(import.meta.dirname, "../../../client/dist")),
});

export const env = schema.parse(process.env);
