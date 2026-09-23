import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const permissionKeys = [
  "application:view",
  "application:review",
  "application:approve",
  "application:reject",
  "document:view",
  "document:verify",
  "payment:verify",
  "program:manage",
  "cycle:manage",
  "user:manage",
  "report:view",
  "audit:view",
  "vc:view",
];

const programs = [
  ["BSCS", "BS Computer Science"],
  ["BSIT", "BS Information Technology"],
  ["BBA", "Bachelor of Business Administration"],
  ["BSAF", "BS Accounting & Finance"],
  ["BSCOM", "BS Commerce"],
  ["BEDH", "B.Ed (Hons)"],
  ["BED25", "B.Ed 2.5 Years"],
  ["BED15", "B.Ed 1.5 Years"],
  ["BSENG", "BS English"],
];

async function main() {
  for (const key of permissionKeys) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }

  const superAdmin = await prisma.role.upsert({
    where: { name: "SUPER_ADMIN" },
    update: {},
    create: { name: "SUPER_ADMIN" },
  });
  const viceChancellor = await prisma.role.upsert({
    where: { name: "VICE_CHANCELLOR" },
    update: {},
    create: { name: "VICE_CHANCELLOR" },
  });

  const permissions = await prisma.permission.findMany();
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdmin.id, permissionId: permission.id } },
      update: {},
      create: { roleId: superAdmin.id, permissionId: permission.id },
    });
  }

  const vcView = permissions.find((permission) => permission.key === "vc:view");
  if (vcView) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: viceChancellor.id, permissionId: vcView.id } },
      update: {},
      create: { roleId: viceChancellor.id, permissionId: vcView.id },
    });
  }

  const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeImmediately123!", 12);
  const user = await prisma.user.upsert({
    where: { email: "admin@usms.edu.pk" },
    update: {},
    create: { email: "admin@usms.edu.pk", passwordHash },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: superAdmin.id } },
    update: {},
    create: { userId: user.id, roleId: superAdmin.id },
  });

  const cycle = await prisma.admissionCycle.upsert({
    where: { id: "00000000-0000-0000-0000-000000000026" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000026",
      name: "Undergraduate Admissions 2026-2027",
      academicYear: "2026-2027",
      applicationPrefix: "USMS-26",
      status: "OPEN",
    },
  });

  for (const [code, name] of programs) {
    const program = await prisma.program.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
    await prisma.programOffering.upsert({
      where: { admissionCycleId_programId: { admissionCycleId: cycle.id, programId: program.id } },
      update: {},
      create: { admissionCycleId: cycle.id, programId: program.id, isOpen: true, applicationFee: 3000 },
    });
  }
}

main().finally(() => prisma.$disconnect());
