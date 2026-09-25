import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

function mariaDbConfigFromUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const database = url.pathname.replace(/^\//, "");
  if (!database) {
    throw new Error("DATABASE_URL must include a database name");
  }

  return {
    host: url.hostname || "127.0.0.1",
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: 5,
    connectTimeout: 10_000,
    acquireTimeout: 10_000,
  };
}

const adapter = new PrismaMariaDb(mariaDbConfigFromUrl(env.DATABASE_URL));
export const prisma = new PrismaClient({ adapter });
