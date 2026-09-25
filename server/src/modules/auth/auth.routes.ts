import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../database/prisma.js";
import { requireAuth, type AuthRequest } from "../../middleware/auth.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

async function loadSession(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  });
  if (!user) {
    return null;
  }
  const roles = user.roles.map((item) => item.role.name);
  const permissions = roles.includes("SUPER_ADMIN")
    ? ["*"]
    : [...new Set(user.roles.flatMap((item) => item.role.permissions.map((entry) => entry.permission.key)))];
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    isActive: user.isActive,
    roles,
    permissions,
  };
}

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid email or password" } });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !user.isActive || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
  }

  const token = jwt.sign({}, env.JWT_SECRET, { subject: user.id, expiresIn: "8h" });
  res.cookie("usms_session", token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    maxAge: 28800000,
    path: "/",
  });

  const session = await loadSession(user.id);
  return res.json({ data: session });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("usms_session", { path: "/" });
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const session = await loadSession(req.auth!.userId);
  res.json({ data: session });
});
