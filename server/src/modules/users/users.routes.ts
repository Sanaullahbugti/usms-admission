import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../database/prisma.js";
import { requireAuth, requirePermission, type AuthRequest } from "../../middleware/auth.js";

export const usersRouter = Router();
usersRouter.use(requireAuth, requirePermission("user:manage"));

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  roleIds: z.array(z.string().uuid()).default([]),
});
const updateRolesSchema = z.object({ roleIds: z.array(z.string().uuid()) });
const updateStatusSchema = z.object({ isActive: z.boolean() });

function mapUser(user: {
  id: string;
  email: string;
  isActive: boolean;
  roles: { role: { id: string; name: string } }[];
}) {
  return {
    id: user.id,
    email: user.email,
    isActive: user.isActive,
    roles: user.roles.map(({ role }) => ({ id: role.id, name: role.name })),
  };
}

async function validateRoles(roleIds: string[]) {
  const ids = [...new Set(roleIds)];
  const roles = await prisma.role.findMany({ where: { id: { in: ids } } });
  return roles.length === ids.length ? ids : null;
}

usersRouter.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { roles: { include: { role: true } } },
  });
  res.json({ data: users.map(mapUser) });
});

usersRouter.post("/", async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Enter a valid email, password and roles" } });

  const roleIds = await validateRoles(parsed.data.roleIds);
  if (!roleIds) return res.status(400).json({ error: { code: "INVALID_ROLE", message: "One or more selected roles do not exist" } });

  const email = parsed.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) {
    return res.status(409).json({ error: { code: "EMAIL_TAKEN", message: "A user with this email already exists" } });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const created = await prisma.user.create({
    data: {
      email,
      passwordHash,
      roles: { create: roleIds.map((roleId) => ({ roleId })) },
    },
    include: { roles: { include: { role: true } } },
  });
  res.status(201).json({ data: mapUser(created) });
});

usersRouter.put("/:id/roles", async (req: AuthRequest, res) => {
  const userId = String(req.params.id ?? "");
  const parsed = updateRolesSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Select valid roles" } });

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
  if (!user) return res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });

  const roleIds = await validateRoles(parsed.data.roleIds);
  if (!roleIds) return res.status(400).json({ error: { code: "INVALID_ROLE", message: "One or more selected roles do not exist" } });

  const isSelf = req.auth!.userId === userId;
  const removingOwnSuperAdmin = isSelf && user.roles.some(({ role }) => role.name === "SUPER_ADMIN") &&
    !(await prisma.role.findMany({ where: { id: { in: roleIds }, name: "SUPER_ADMIN" } })).length;
  if (removingOwnSuperAdmin) {
    return res.status(409).json({ error: { code: "SELF_LOCKOUT", message: "You cannot remove your own Super Admin access" } });
  }

  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId } }),
    ...(roleIds.length ? [prisma.userRole.createMany({ data: roleIds.map((roleId) => ({ userId, roleId })) })] : []),
  ]);
  const updated = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { roles: { include: { role: true } } } });
  res.json({ data: mapUser(updated) });
});

usersRouter.patch("/:id/status", async (req: AuthRequest, res) => {
  const userId = String(req.params.id ?? "");
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid user status" } });
  if (req.auth!.userId === userId && !parsed.data.isActive) {
    return res.status(409).json({ error: { code: "SELF_LOCKOUT", message: "You cannot disable your own account" } });
  }
  const exists = await prisma.user.findUnique({ where: { id: userId } });
  if (!exists) return res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: parsed.data.isActive },
    include: { roles: { include: { role: true } } },
  });
  res.json({ data: mapUser(updated) });
});
