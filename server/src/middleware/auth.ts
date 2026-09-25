import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../database/prisma.js";

export interface AuthRequest extends Request {
  auth?: { userId: string; roles: string[]; permissions: string[] };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.usms_session as string | undefined;
  if (!token) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Please sign in" } });

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });
    if (!user || !user.isActive) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Please sign in" } });

    const roles = user.roles.map((item) => item.role.name);
    const permissions = roles.includes("SUPER_ADMIN")
      ? ["*"]
      : [...new Set(user.roles.flatMap((item) => item.role.permissions.map((entry) => entry.permission.key)))];

    req.auth = { userId: user.id, roles, permissions };
    next();
  } catch {
    return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Session expired" } });
  }
}

export function hasPermission(req: AuthRequest, permission: string) {
  return Boolean(req.auth?.permissions.includes("*") || req.auth?.permissions.includes(permission));
}

export const requirePermission = (permission: string) => (req: AuthRequest, res: Response, next: NextFunction) =>
  hasPermission(req, permission)
    ? next()
    : res.status(403).json({ error: { code: "FORBIDDEN", message: "You do not have permission to perform this action" } });

export const requireAnyPermission =
  (...permissions: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) =>
    permissions.some((permission) => hasPermission(req, permission))
      ? next()
      : res.status(403).json({ error: { code: "FORBIDDEN", message: "You do not have permission to access this area" } });

export const requireRole =
  (...allowedRoles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) =>
    req.auth?.roles.some((role) => allowedRoles.includes(role))
      ? next()
      : res.status(403).json({ error: { code: "FORBIDDEN", message: "You do not have permission to perform this action" } });
