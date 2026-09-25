import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../database/prisma.js";
import { requireAuth, requirePermission, type AuthRequest } from "../../middleware/auth.js";

export const rolesRouter = Router();

rolesRouter.use(requireAuth);

const roleSchema = z.object({
  name: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9 _-]+$/, "Use letters, numbers, spaces, hyphens or underscores"),
  permissionIds: z.array(z.string().uuid()).default([]),
});

function mapRole(role: {
  id: string;
  name: string;
  permissions: { permission: { id: string; key: string } }[];
  _count?: { users: number };
}) {
  return {
    id: role.id,
    name: role.name,
    isSystem: ["SUPER_ADMIN", "APPLICANT"].includes(role.name),
    userCount: role._count?.users ?? 0,
    permissions: role.permissions.map(({ permission }) => permission),
  };
}

rolesRouter.get("/permissions", requirePermission("role:manage"), async (_req, res) => {
  const permissions = await prisma.permission.findMany({ orderBy: { key: "asc" } });
  res.json({ data: permissions });
});

rolesRouter.get("/", requirePermission("role:manage"), async (_req, res) => {
  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });
  res.json({ data: roles.map(mapRole) });
});

rolesRouter.post("/", requirePermission("role:manage"), async (req, res) => {
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid role" } });
  }

  const normalizedName = parsed.data.name.replace(/\s+/g, " ").trim();
  const duplicate = await prisma.role.findFirst({ where: { name: normalizedName } });
  if (duplicate) {
    return res.status(409).json({ error: { code: "ROLE_EXISTS", message: "A role with this name already exists" } });
  }

  const permissionCount = await prisma.permission.count({ where: { id: { in: parsed.data.permissionIds } } });
  if (permissionCount !== new Set(parsed.data.permissionIds).size) {
    return res.status(400).json({ error: { code: "INVALID_PERMISSION", message: "One or more permissions do not exist" } });
  }

  const role = await prisma.role.create({
    data: {
      name: normalizedName,
      permissions: { create: [...new Set(parsed.data.permissionIds)].map((permissionId) => ({ permissionId })) },
    },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });
  res.status(201).json({ data: mapRole(role) });
});

rolesRouter.put("/:id", requirePermission("role:manage"), async (req: AuthRequest, res) => {
  const roleId = String(req.params.id ?? "");
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid role" } });
  }

  const existing = await prisma.role.findUnique({ where: { id: roleId } });
  if (!existing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Role not found" } });
  if (["SUPER_ADMIN", "APPLICANT"].includes(existing.name)) {
    return res.status(409).json({ error: { code: "SYSTEM_ROLE", message: "System roles cannot be edited" } });
  }

  const normalizedName = parsed.data.name.replace(/\s+/g, " ").trim();
  const duplicate = await prisma.role.findFirst({ where: { name: normalizedName, NOT: { id: roleId } } });
  if (duplicate) return res.status(409).json({ error: { code: "ROLE_EXISTS", message: "A role with this name already exists" } });

  const permissionIds = [...new Set(parsed.data.permissionIds)];
  const permissionCount = await prisma.permission.count({ where: { id: { in: permissionIds } } });
  if (permissionCount !== permissionIds.length) {
    return res.status(400).json({ error: { code: "INVALID_PERMISSION", message: "One or more permissions do not exist" } });
  }

  await prisma.$transaction([
    prisma.role.update({ where: { id: roleId }, data: { name: normalizedName } }),
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    ...(permissionIds.length ? [prisma.rolePermission.createMany({ data: permissionIds.map((permissionId) => ({ roleId, permissionId })) })] : []),
  ]);

  const updated = await prisma.role.findUniqueOrThrow({
    where: { id: roleId },
    include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
  });
  res.json({ data: mapRole(updated) });
});

rolesRouter.delete("/:id", requirePermission("role:manage"), async (req, res) => {
  const roleId = String(req.params.id ?? "");
  const role = await prisma.role.findUnique({ where: { id: roleId }, include: { _count: { select: { users: true } } } });
  if (!role) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Role not found" } });
  if (["SUPER_ADMIN", "APPLICANT"].includes(role.name)) {
    return res.status(409).json({ error: { code: "SYSTEM_ROLE", message: "System roles cannot be deleted" } });
  }
  if (role._count.users > 0) {
    return res.status(409).json({ error: { code: "ROLE_IN_USE", message: "Remove this role from its users before deleting it" } });
  }
  await prisma.role.delete({ where: { id: roleId } });
  res.status(204).end();
});
