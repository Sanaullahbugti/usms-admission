import { mkdirSync } from "node:fs";
import { basename, join, normalize, resolve, sep } from "node:path";
import { env } from "../config/env.js";

/** Absolute private uploads directory (outside any web root on cPanel). */
export function getUploadsDir(): string {
  return resolve(env.UPLOADS_DIR);
}

export function ensureUploadsDir(): string {
  const dir = getUploadsDir();
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Resolve a stored relative object key to an absolute path under UPLOADS_DIR.
 * Rejects path traversal. Bytes stay on disk; MariaDB stores only the key.
 */
export function resolveUploadPath(relativeKey: string): string {
  const clean = relativeKey.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!clean || clean.includes("..") || clean.split("/").some((part) => part === "" || part === ".")) {
    throw new Error("Invalid upload key");
  }
  const root = getUploadsDir();
  const absolute = normalize(join(root, ...clean.split("/")));
  const rootWithSep = root.endsWith(sep) ? root : `${root}${sep}`;
  if (absolute !== root && !absolute.startsWith(rootWithSep)) {
    throw new Error("Upload path escapes uploads directory");
  }
  return absolute;
}

export function applicationUploadKey(applicationId: string, originalFileName: string): string {
  const safeName = basename(originalFileName).replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${applicationId}/${Date.now()}-${safeName}`;
}
