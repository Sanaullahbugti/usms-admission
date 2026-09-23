import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../database/prisma.js";
import { requireAuth, requirePermission, type AuthRequest } from "../../middleware/auth.js";

export const usersRouter = Router();
const assignableRoles = ["VICE_CHANCELLOR"] as const;

usersRouter.use(requireAuth, requirePermission("user:manage"));

function mapUser(user: {
  id: string;
  email: string;
  isActive: boolean;
  roles: { role: { name: string } }[];
}) {
  return {
    id: user.id,
    email: user.email,
    isActive: user.isActive,
    roles: user.roles.map((item) => item.role.name),
  };
}

usersRouter.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { roles: { include: { role: true } } },
  });
  res.json({ data: users.map(mapUser) });
});

usersRouter.post("/", async (req, res) => {
  const parsed = z
    .object({
      email: z.string().email(),
      password: z.string().min(8),
      roleName: z.enum(assignableRoles).optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid user details" } });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: { code: "EMAIL_TAKEN", message: "A user with this email already exists" } });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const created = await prisma.user.create({
    data: { email, passwordHash },
    include: { roles: { include: { role: true } } },
  });

  if (parsed.data.roleName) {
    const role = await prisma.role.findUnique({ where: { name: parsed.data.roleName } });
    if (role) {
      await prisma.userRole.create({ data: { userId: created.id, roleId: role.id } });
    }
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: created.id },
    include: { roles: { include: { role: true } } },
  });
  res.status(201).json({ data: mapUser(user) });
});

usersRouter.post("/:id/roles", async (req: AuthRequest, res) => {
  const userId = typeof req.params.id === "string" ? req.params.id : "";
  const parsed = z.object({ roleName: z.enum(assignableRoles) }).safeParse(req.body);
  if (!userId || !parsed.success) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Only the VICE_CHANCELLOR role can be assigned here" } });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
  }

  const role = await prisma.role.findUnique({ where: { name: parsed.data.roleName } });
  if (!role) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Role not found" } });
  }

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });

  const updated = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    include: { roles: { include: { role: true } } },
  });
  res.json({ data: mapUser(updated) });
});

usersRouter.delete("/:id/roles/:roleName", async (req, res) => {
  const userId = typeof req.params.id === "string" ? req.params.id : "";
  const roleName = typeof req.params.roleName === "string" ? req.params.roleName : "";
  if (!userId || !roleName || !assignableRoles.includes(roleName as (typeof assignableRoles)[number])) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Only the VICE_CHANCELLOR role can be removed here" } });
  }

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Role not found" } });
  }

  await prisma.userRole.deleteMany({ where: { userId, roleId: role.id } });
  const updated = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  if (!updated) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
  }
  res.json({ data: mapUser(updated) });
});
