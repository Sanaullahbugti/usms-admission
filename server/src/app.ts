import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { env } from "./config/env.js";
import { ensureUploadsDir } from "./lib/storage.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { admissionConfigRouter } from "./modules/admission-config/admission-config.routes.js";
import { applicationsRouter } from "./modules/applications/applications.routes.js";
import { documentsRouter } from "./modules/applications/documents.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

ensureUploadsDir();

export const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.get("/api/health", (_req, res) => res.json({ data: { status: "ok", service: "usms-admission-api" } }));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/admission-config", admissionConfigRouter);
app.use("/api/v1/applications", documentsRouter);
app.use("/api/v1/applications", applicationsRouter);

const clientDist = env.CLIENT_DIST_DIR;
const serveSpa = existsSync(join(clientDist, "index.html"));
if (serveSpa) {
  app.use(express.static(clientDist, { index: false }));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }
    if (req.path.startsWith("/api")) {
      return next();
    }
    return res.sendFile(join(clientDist, "index.html"));
  });
}

app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
});
