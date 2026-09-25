import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../database/prisma.js";
import { sendApplicantCredentials } from "../../lib/mail.js";
import { requireAuth, requirePermission, type AuthRequest } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import { ensureDraftSchema } from "./draft-schema.js";

export const applicationsRouter = Router();

const REQUIRED_SUBMIT_DOCS = ["SSC", "HSC", "CNIC", "DOMICILE", "PHOTO"] as const;

const educationLevelSchema = z.enum(["SSC", "HSC", "DIPLOMA", "DEGREE", "EXTRA1", "EXTRA2", "EXTRA3"]);

function parseMarksNumber(value: string | null | undefined): number | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  if (!Number.isFinite(number)) return null;
  return number;
}

function marksValidationMessage(
  level: string,
  obtainedMarks: string | null | undefined,
  totalMarks: string | null | undefined,
  cgpa?: string | null,
): string | null {
  const cgpaRaw = cgpa?.trim() ?? "";
  if (cgpaRaw) {
    const value = Number(cgpaRaw);
    if (!Number.isFinite(value) || value < 0 || value > 4) {
      return `${level} CGPA must be a number between 0 and 4.00`;
    }
    return null;
  }

  const obtainedRaw = obtainedMarks?.trim() ?? "";
  const totalRaw = totalMarks?.trim() ?? "";
  if (!obtainedRaw && !totalRaw) return null;

  const obtained = parseMarksNumber(obtainedMarks);
  const total = parseMarksNumber(totalMarks);

  if (obtainedRaw && obtained == null) {
    return `${level} obtained marks must be a number`;
  }
  if (totalRaw && total == null) {
    return `${level} total marks must be a number`;
  }
  if (obtained != null && obtained < 0) {
    return `${level} obtained marks cannot be negative`;
  }
  if (total != null && total <= 0) {
    return `${level} total marks must be greater than 0`;
  }
  if (obtained != null && total != null && obtained > total) {
    return `${level} obtained marks (${obtained}) cannot exceed total marks (${total})`;
  }
  return null;
}

const draftEducationSchema = z
  .object({
    level: educationLevelSchema,
    group: z.string().max(80).optional().nullable(),
    board: z.string().max(120).optional().nullable(),
    year: z.string().max(10).optional().nullable(),
    obtainedMarks: z.string().max(20).optional().nullable(),
    totalMarks: z.string().max(20).optional().nullable(),
    cgpa: z.string().max(20).optional().nullable(),
    rollNumber: z.string().max(60).optional().nullable(),
    institutionType: z.string().max(80).optional().nullable(),
  })
  .superRefine((row, ctx) => {
    const message = marksValidationMessage(row.level, row.obtainedMarks, row.totalMarks, row.cgpa);
    if (message) {
      ctx.addIssue({ code: "custom", message, path: ["obtainedMarks"] });
    }
  });

const draftSchema = z.object({
  surname: z.string().max(120).optional().nullable(),
  mobile: z.string().max(20).optional().nullable(),
  dateOfBirth: z.string().max(32).optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  domicileDistrict: z.string().max(80).optional().nullable(),
  province: z.string().max(80).optional().nullable(),
  nationality: z.string().max(80).optional().nullable(),
  postalAddress: z.string().max(300).optional().nullable(),
  residentialAddress: z.string().max(300).optional().nullable(),
  fatherOccupation: z.string().max(120).optional().nullable(),
  householdIncome: z.string().max(120).optional().nullable(),
  emergencyContact: z.string().max(160).optional().nullable(),
  emergencyPhone: z.string().max(20).optional().nullable(),
  hasSibling: z.boolean().optional(),
  siblingName: z.string().max(120).optional().nullable(),
  siblingRegNo: z.string().max(60).optional().nullable(),
  programOfferingIds: z.array(z.string().min(1).max(64)).min(0).max(10).optional(),
  education: z.array(draftEducationSchema).max(5).optional(),
});

type EducationRow = {
  id: string;
  applicationId: string;
  level: string;
  group: string | null;
  board: string | null;
  year: string | null;
  obtainedMarks: string | null;
  totalMarks: string | null;
  cgpa: string | null;
  rollNumber: string | null;
  institutionType: string | null;
};

type DocumentSummary = {
  id: string;
  docType: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  uploadedAt: Date;
};

function parseOptionalDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("INVALID_DATE");
  }
  return date;
}

async function listEducation(applicationId: string): Promise<EducationRow[]> {
  try {
    return await prisma.$queryRawUnsafe<EducationRow[]>(
      `SELECT \`id\`, \`applicationId\`, \`level\`, \`group\`, \`board\`, \`year\`, \`obtainedMarks\`, \`totalMarks\`, \`cgpa\`, \`rollNumber\`, \`institutionType\`
       FROM \`ApplicationEducation\` WHERE \`applicationId\` = ? ORDER BY \`level\` ASC`,
      applicationId,
    );
  } catch {
    const rows = await prisma.$queryRawUnsafe<Array<Omit<EducationRow, "cgpa">>>(
      `SELECT \`id\`, \`applicationId\`, \`level\`, \`group\`, \`board\`, \`year\`, \`obtainedMarks\`, \`totalMarks\`, \`rollNumber\`, \`institutionType\`
       FROM \`ApplicationEducation\` WHERE \`applicationId\` = ? ORDER BY \`level\` ASC`,
      applicationId,
    );
    return rows.map((row) => ({ ...row, cgpa: null }));
  }
}

async function listDocuments(applicationId: string): Promise<DocumentSummary[]> {
  try {
    return await prisma.$queryRawUnsafe<DocumentSummary[]>(
      `SELECT \`id\`, \`docType\`, \`originalName\`, \`mimeType\`, \`sizeBytes\`, \`status\`, \`uploadedAt\`
       FROM \`ApplicationDocument\` WHERE \`applicationId\` = ? ORDER BY \`uploadedAt\` ASC`,
      applicationId,
    );
  } catch {
    return [];
  }
}

async function upsertEducation(
  applicationId: string,
  row: z.infer<typeof draftEducationSchema>,
) {
  const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT \`id\` FROM \`ApplicationEducation\` WHERE \`applicationId\` = ? AND \`level\` = ? LIMIT 1`,
    applicationId,
    row.level,
  );
  const now = new Date();
  if (existing[0]) {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE \`ApplicationEducation\` SET
          \`group\` = ?, \`board\` = ?, \`year\` = ?, \`obtainedMarks\` = ?, \`totalMarks\` = ?, \`cgpa\` = ?,
          \`rollNumber\` = ?, \`institutionType\` = ?, \`updatedAt\` = ?
         WHERE \`id\` = ?`,
        row.group ?? null,
        row.board ?? null,
        row.year ?? null,
        row.obtainedMarks ?? null,
        row.totalMarks ?? null,
        row.cgpa ?? null,
        row.rollNumber ?? null,
        row.institutionType ?? null,
        now,
        existing[0].id,
      );
    } catch {
      await prisma.$executeRawUnsafe(
        `UPDATE \`ApplicationEducation\` SET
          \`group\` = ?, \`board\` = ?, \`year\` = ?, \`obtainedMarks\` = ?, \`totalMarks\` = ?,
          \`rollNumber\` = ?, \`institutionType\` = ?, \`updatedAt\` = ?
         WHERE \`id\` = ?`,
        row.group ?? null,
        row.board ?? null,
        row.year ?? null,
        row.obtainedMarks ?? null,
        row.totalMarks ?? null,
        row.rollNumber ?? null,
        row.institutionType ?? null,
        now,
        existing[0].id,
      );
    }
    return;
  }
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO \`ApplicationEducation\`
        (\`id\`, \`applicationId\`, \`level\`, \`group\`, \`board\`, \`year\`, \`obtainedMarks\`, \`totalMarks\`, \`cgpa\`, \`rollNumber\`, \`institutionType\`, \`createdAt\`, \`updatedAt\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      randomUUID(),
      applicationId,
      row.level,
      row.group ?? null,
      row.board ?? null,
      row.year ?? null,
      row.obtainedMarks ?? null,
      row.totalMarks ?? null,
      row.cgpa ?? null,
      row.rollNumber ?? null,
      row.institutionType ?? null,
      now,
      now,
    );
  } catch {
    await prisma.$executeRawUnsafe(
      `INSERT INTO \`ApplicationEducation\`
        (\`id\`, \`applicationId\`, \`level\`, \`group\`, \`board\`, \`year\`, \`obtainedMarks\`, \`totalMarks\`, \`rollNumber\`, \`institutionType\`, \`createdAt\`, \`updatedAt\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      randomUUID(),
      applicationId,
      row.level,
      row.group ?? null,
      row.board ?? null,
      row.year ?? null,
      row.obtainedMarks ?? null,
      row.totalMarks ?? null,
      row.rollNumber ?? null,
      row.institutionType ?? null,
      now,
      now,
    );
  }
}

async function updateProfileDraft(
  profileId: string,
  data: z.infer<typeof draftSchema>,
  dateOfBirth: Date | null | undefined,
) {
  // Core fields via Prisma (available on production client).
  await prisma.applicantProfile.update({
    where: { id: profileId },
    data: {
      ...(data.surname !== undefined ? { surname: data.surname } : {}),
      ...(data.mobile !== undefined ? { mobile: data.mobile } : {}),
      ...(dateOfBirth !== undefined ? { dateOfBirth } : {}),
      ...(data.gender !== undefined ? { gender: data.gender } : {}),
      ...(data.domicileDistrict !== undefined ? { domicileDistrict: data.domicileDistrict } : {}),
      ...(data.province !== undefined ? { province: data.province } : {}),
      ...(data.nationality !== undefined ? { nationality: data.nationality } : {}),
      ...(data.postalAddress !== undefined ? { postalAddress: data.postalAddress } : {}),
      ...(data.residentialAddress !== undefined ? { residentialAddress: data.residentialAddress } : {}),
      ...(data.fatherOccupation !== undefined ? { fatherOccupation: data.fatherOccupation } : {}),
    },
  });

  // Family fields may be missing from older generated clients — write with SQL.
  await prisma.$executeRawUnsafe(
    `UPDATE \`ApplicantProfile\` SET
      \`householdIncome\` = COALESCE(?, \`householdIncome\`),
      \`emergencyContact\` = COALESCE(?, \`emergencyContact\`),
      \`emergencyPhone\` = COALESCE(?, \`emergencyPhone\`),
      \`hasSibling\` = COALESCE(?, \`hasSibling\`),
      \`siblingName\` = COALESCE(?, \`siblingName\`),
      \`siblingRegNo\` = COALESCE(?, \`siblingRegNo\`)
     WHERE \`id\` = ?`,
    data.householdIncome !== undefined ? data.householdIncome : null,
    data.emergencyContact !== undefined ? data.emergencyContact : null,
    data.emergencyPhone !== undefined ? data.emergencyPhone : null,
    data.hasSibling !== undefined ? data.hasSibling : null,
    data.siblingName !== undefined ? data.siblingName : null,
    data.siblingRegNo !== undefined ? data.siblingRegNo : null,
    profileId,
  );
}

async function loadFamilyFields(applicationId: string) {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      householdIncome: string | null;
      emergencyContact: string | null;
      emergencyPhone: string | null;
      hasSibling: number | boolean | null;
      siblingName: string | null;
      siblingRegNo: string | null;
    }>
  >(
    `SELECT \`householdIncome\`, \`emergencyContact\`, \`emergencyPhone\`, \`hasSibling\`, \`siblingName\`, \`siblingRegNo\`
     FROM \`ApplicantProfile\` WHERE \`applicationId\` = ? LIMIT 1`,
    applicationId,
  );
  return rows[0] ?? null;
}

async function loadMyApplication(userId: string) {
  await ensureDraftSchema();
  const app = await prisma.application.findFirst({
    where: { userId },
    include: {
      admissionCycle: true,
      profile: true,
      programChoices: {
        orderBy: { preferenceOrder: "asc" },
        include: { programOffering: { include: { program: true } } },
      },
      reviews: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!app) {
    return null;
  }
  const [education, documents, family] = await Promise.all([
    listEducation(app.id),
    listDocuments(app.id),
    loadFamilyFields(app.id),
  ]);
  const profile = app.profile
    ? {
        ...app.profile,
        householdIncome: family?.householdIncome ?? null,
        emergencyContact: family?.emergencyContact ?? null,
        emergencyPhone: family?.emergencyPhone ?? null,
        hasSibling: Boolean(family?.hasSibling),
        siblingName: family?.siblingName ?? null,
        siblingRegNo: family?.siblingRegNo ?? null,
      }
    : null;
  return { ...app, profile, education, documents };
}

const submit = z.object({
  applicantName: z
    .string()
    .trim()
    .min(3, "Enter the full applicant name (at least 3 characters)")
    .max(120, "Applicant name is too long"),
  fatherName: z
    .string()
    .trim()
    .min(3, "Enter the father’s / guardian’s name (at least 3 characters)")
    .max(120, "Father’s name is too long"),
  surname: z
    .string()
    .trim()
    .max(120, "Surname is too long")
    .optional()
    .or(z.literal("")),
  cnicBform: z
    .string()
    .trim()
    .min(1, "Enter the CNIC or B-Form number")
    .max(20, "CNIC / B-Form number is too long")
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value.length === 13, {
      message: "CNIC / B-Form must be 13 digits (dashes are optional)",
    })
    .transform((digits) => `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`),
  email: z
    .string()
    .trim()
    .min(1, "Enter an email address")
    .email("Enter a valid email address")
    .transform((value) => value.toLowerCase()),
});

function cnicDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

applicationsRouter.post("/public/submit", rateLimit(5, 60_000), async (req, res) => {
  const parsed = submit.safeParse(req.body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const first =
      Object.values(fieldErrors).flat().find((message) => typeof message === "string" && message.length > 0) ??
      "Please check the admission form";
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: first,
        details: { fieldErrors },
      },
    });
  }

  const data = parsed.data;
  const email = data.email;
  const cycle = await prisma.admissionCycle.findFirst({ where: { status: "OPEN" } });
  if (!cycle) {
    return res.status(409).json({ error: { code: "ADMISSIONS_CLOSED", message: "Admissions are not currently open" } });
  }

  const cycleProfiles = await prisma.applicantProfile.findMany({
    where: { application: { admissionCycleId: cycle.id }, cnicBform: { not: null } },
    select: { cnicBform: true },
  });
  const cnicTaken = cycleProfiles.some((row) => cnicDigits(row.cnicBform) === cnicDigits(data.cnicBform));
  if (cnicTaken) {
    return res.status(409).json({
      error: {
        code: "DUPLICATE_APPLICATION",
        message: "An application already exists for this CNIC / B-Form in the current admission cycle. Sign in with your existing account instead.",
        details: { fieldErrors: { cnicBform: ["This CNIC / B-Form is already registered for this cycle"] } },
      },
    });
  }

  const emailTaken = await prisma.user.findUnique({ where: { email } });
  if (emailTaken) {
    return res.status(409).json({
      error: {
        code: "EMAIL_TAKEN",
        message: "This email is already registered. Sign in with your existing account instead of opening a new file.",
        details: { fieldErrors: { email: ["This email is already registered"] } },
      },
    });
  }

  const count = await prisma.application.count({ where: { admissionCycleId: cycle.id } });
  const applicationNo = `${cycle.applicationPrefix}-${String(count + 1).padStart(6, "0")}`;
  const temporaryPassword = randomBytes(6).toString("base64url");
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const applicantRole = await prisma.role.findUnique({ where: { name: "APPLICANT" } });
  if (!applicantRole) {
    return res.status(500).json({ error: { code: "CONFIGURATION_ERROR", message: "Applicant role is not configured" } });
  }

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          loginId: applicationNo,
          passwordHash,
          roles: { create: { roleId: applicantRole.id } },
        },
      });
      return tx.application.create({
        data: {
          applicationNo,
          userId: user.id,
          admissionCycleId: cycle.id,
          status: "DRAFT",
          profile: {
            create: {
              applicantName: data.applicantName,
              fatherName: data.fatherName,
              surname: data.surname?.trim() ? data.surname.trim() : null,
              cnicBform: data.cnicBform,
              email,
              nationality: "Pakistani",
            },
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(" ") : String(error.meta?.target ?? "");
      if (target.includes("email")) {
        return res.status(409).json({
          error: {
            code: "EMAIL_TAKEN",
            message: "This email is already registered. Sign in with your existing account instead of opening a new file.",
            details: { fieldErrors: { email: ["This email is already registered"] } },
          },
        });
      }
      return res.status(409).json({
        error: {
          code: "DUPLICATE_APPLICATION",
          message: "An application already exists for these details. Sign in with your existing account instead.",
        },
      });
    }
    throw error;
  }

  const mail = await sendApplicantCredentials({
    to: email,
    applicantName: data.applicantName,
    applicationNo: result.applicationNo ?? applicationNo,
    temporaryPassword,
  });

  return res.status(201).json({
    data: {
      applicationNo: result.applicationNo ?? applicationNo,
      emailSent: mail.sent,
      ...(mail.sent ? {} : { temporaryPassword }),
      message: mail.sent
        ? "Your file is open. Check your email, then sign in to continue the application."
        : "Your file is open. Save these login details, then sign in to continue the application.",
    },
  });
});

applicationsRouter.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const app = await loadMyApplication(req.auth!.userId);
  if (!app) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Application not found" } });
  }
  return res.json({ data: app });
});

applicationsRouter.patch("/me/draft", requireAuth, async (req: AuthRequest, res) => {
  await ensureDraftSchema();
  const parsed = draftSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Invalid draft payload", details: parsed.error.flatten() },
    });
  }

  const app = await prisma.application.findFirst({
    where: { userId: req.auth!.userId },
    include: { profile: true },
  });
  if (!app) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Application not found" } });
  }
  if (app.status !== "DRAFT" && app.status !== "CHANGE_REQUESTED") {
    return res.status(409).json({
      error: { code: "NOT_EDITABLE", message: "Only draft or change-requested applications can be updated" },
    });
  }

  const data = parsed.data;
  let dateOfBirth: Date | null | undefined;
  try {
    dateOfBirth = parseOptionalDate(data.dateOfBirth);
  } catch {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid date of birth" } });
  }

  if (data.programOfferingIds && data.programOfferingIds.length > 0) {
    const uniqueIds = [...new Set(data.programOfferingIds)];
    const offerings = await prisma.programOffering.findMany({
      where: {
        id: { in: uniqueIds },
        admissionCycleId: app.admissionCycleId,
        isOpen: true,
      },
    });
    if (offerings.length !== uniqueIds.length) {
      return res.status(400).json({
        error: { code: "INVALID_OFFERING", message: "One or more program choices are not open in this cycle" },
      });
    }
  }

  if (app.profile) {
    await updateProfileDraft(app.profile.id, data, dateOfBirth);
  }

  if (data.programOfferingIds) {
    await prisma.$transaction(async (tx) => {
      await tx.applicationProgramChoice.deleteMany({ where: { applicationId: app.id } });
      if (data.programOfferingIds && data.programOfferingIds.length > 0) {
        await tx.applicationProgramChoice.createMany({
          data: data.programOfferingIds.map((programOfferingId, index) => ({
            applicationId: app.id,
            programOfferingId,
            preferenceOrder: index + 1,
          })),
        });
      }
    });
  }

  if (data.education) {
    for (const row of data.education) {
      const marksError = marksValidationMessage(row.level, row.obtainedMarks, row.totalMarks);
      if (marksError) {
        return res.status(400).json({
          error: {
            code: "INVALID_MARKS",
            message: marksError,
            details: { fieldErrors: { obtainedMarks: [marksError] } },
          },
        });
      }
    }
    for (const row of data.education) {
      await upsertEducation(app.id, row);
    }
  }

  const updated = await loadMyApplication(req.auth!.userId);
  return res.json({ data: updated });
});

applicationsRouter.post("/me/submit", requireAuth, async (req: AuthRequest, res) => {
  await ensureDraftSchema();
  const app = await prisma.application.findFirst({
    where: { userId: req.auth!.userId },
    include: {
      profile: true,
      programChoices: true,
    },
  });
  if (!app) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Application not found" } });
  }
  if (app.status !== "DRAFT" && app.status !== "CHANGE_REQUESTED") {
    return res.status(409).json({
      error: { code: "NOT_SUBMITTABLE", message: "Application is already submitted or closed for edits" },
    });
  }

  const education = await listEducation(app.id);
  const documents = await listDocuments(app.id);

  const profile = app.profile;
  const missing: string[] = [];
  if (!profile?.mobile?.trim()) missing.push("mobile");
  if (!profile?.dateOfBirth) missing.push("dateOfBirth");
  if (!profile?.gender?.trim()) missing.push("gender");
  if (!profile?.domicileDistrict?.trim()) missing.push("domicileDistrict");
  if (!profile?.postalAddress?.trim()) missing.push("postalAddress");
  if (app.programChoices.length < 1) missing.push("programChoices");

  const ssc = education.find((row) => row.level === "SSC");
  const hsc = education.find((row) => row.level === "HSC");
  if (!ssc?.board || !ssc.obtainedMarks || !ssc.totalMarks) missing.push("education.SSC");
  if (!hsc?.board || !hsc.obtainedMarks || !hsc.totalMarks) missing.push("education.HSC");

  const sscMarksError = marksValidationMessage("SSC", ssc?.obtainedMarks, ssc?.totalMarks);
  const hscMarksError = marksValidationMessage("HSC", hsc?.obtainedMarks, hsc?.totalMarks);
  if (sscMarksError || hscMarksError) {
    return res.status(400).json({
      error: {
        code: "INVALID_MARKS",
        message: sscMarksError ?? hscMarksError ?? "Marks are invalid",
      },
    });
  }

  const uploaded = new Set(documents.map((doc) => doc.docType));
  for (const docType of REQUIRED_SUBMIT_DOCS) {
    if (!uploaded.has(docType)) missing.push(`document.${docType}`);
  }

  if (missing.length > 0) {
    return res.status(400).json({
      error: {
        code: "INCOMPLETE_APPLICATION",
        message: "Complete profile, program choices, education, and required documents before submitting",
        details: { missing },
      },
    });
  }

  const isResubmit = app.status === "CHANGE_REQUESTED";
  const nextStatus = isResubmit ? "UNDER_REVIEW" : "SUBMITTED";

  await prisma.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: app.id },
      data: {
        status: nextStatus,
        submittedAt: new Date(),
        version: { increment: 1 },
      },
    });
    await tx.applicationReview.create({
      data: {
        applicationId: app.id,
        reviewerId: req.auth!.userId,
        action: isResubmit ? "RESUBMIT" : "SUBMIT",
        message: isResubmit ? "Applicant resubmitted after change request" : "Applicant submitted application",
      },
    });
  });

  const updated = await loadMyApplication(req.auth!.userId);
  return res.json({ data: updated });
});

function hscPercentage(obtained: string | null | undefined, total: string | null | undefined) {
  const got = Number(obtained);
  const max = Number(total);
  if (!Number.isFinite(got) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }
  return Math.round((got / max) * 1000) / 10;
}

applicationsRouter.get("/", requireAuth, requirePermission("application:view"), async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const apps = await prisma.application.findMany({
    where: {
      ...(status ? { status: status as never } : { status: { not: "DRAFT" } }),
      ...(q
        ? {
            OR: [
              { applicationNo: { contains: q } },
              { profile: { applicantName: { contains: q } } },
              { profile: { cnicBform: { contains: q } } },
              { profile: { mobile: { contains: q } } },
            ],
          }
        : {}),
    },
    include: {
      profile: true,
      programChoices: {
        where: { preferenceOrder: 1 },
        include: { programOffering: { include: { program: true } } },
      },
    },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  const ids = apps.map((row) => row.id);
  const hscByApp = new Map<string, { obtainedMarks: string | null; totalMarks: string | null }>();
  if (ids.length > 0) {
    const placeholders = ids.map(() => "?").join(", ");
    try {
      const rows = await prisma.$queryRawUnsafe<
        Array<{ applicationId: string; obtainedMarks: string | null; totalMarks: string | null }>
      >(
        `SELECT \`applicationId\`, \`obtainedMarks\`, \`totalMarks\`
         FROM \`ApplicationEducation\`
         WHERE \`level\` = 'HSC' AND \`applicationId\` IN (${placeholders})`,
        ...ids,
      );
      for (const row of rows) {
        hscByApp.set(row.applicationId, row);
      }
    } catch {
      // Education table may be unavailable on older deployments; leave percentages at 0.
    }
  }

  return res.json({
    data: apps.map((a) => {
      const hsc = hscByApp.get(a.id);
      return {
        id: a.id,
        applicationNo: a.applicationNo ?? "",
        applicantName: a.profile?.applicantName ?? "",
        cnic: a.profile?.cnicBform ?? "",
        mobile: a.profile?.mobile ?? "",
        district: a.profile?.domicileDistrict ?? "",
        program: a.programChoices[0]?.programOffering.program.name ?? "",
        hscPercentage: hscPercentage(hsc?.obtainedMarks, hsc?.totalMarks),
        status: a.status,
        paymentStatus: a.paymentStatus,
        submittedAt: a.submittedAt?.toISOString() ?? a.createdAt.toISOString(),
      };
    }),
  });
});

applicationsRouter.get("/:id", requireAuth, requirePermission("application:view"), async (req, res) => {
  const id = typeof req.params.id === "string" ? req.params.id : "";
  if (!id) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Application id is required" } });
  }
  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      profile: true,
      admissionCycle: true,
      programChoices: {
        orderBy: { preferenceOrder: "asc" },
        include: { programOffering: { include: { program: true } } },
      },
      reviews: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!app) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Application not found" } });
  }
  await ensureDraftSchema();
  const [education, documents] = await Promise.all([listEducation(app.id), listDocuments(app.id)]);
  return res.json({
    data: {
      ...app,
      submittedAt: app.submittedAt?.toISOString() ?? null,
      approvedAt: app.approvedAt?.toISOString() ?? null,
      rejectedAt: app.rejectedAt?.toISOString() ?? null,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
      education,
      documents,
      reviews: app.reviews.map((review) => ({
        id: review.id,
        action: review.action,
        message: review.message,
        createdAt: review.createdAt.toISOString(),
        reviewerId: review.reviewerId,
      })),
    },
  });
});

const review = z.object({
  action: z.enum(["START_REVIEW", "REQUEST_CHANGES", "APPROVE", "REJECT"]),
  message: z.string().max(1000).optional(),
});

applicationsRouter.post("/:id/review", requireAuth, requirePermission("application:review"), async (req: AuthRequest, res) => {
  const id = typeof req.params.id === "string" ? req.params.id : "";
  if (!id) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Application id is required" } });
  }
  const parsed = review.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid review action" } });
  }
  if (parsed.data.action === "REQUEST_CHANGES" && !parsed.data.message?.trim()) {
    return res.status(400).json({ error: { code: "MESSAGE_REQUIRED", message: "Tell the applicant what needs to be corrected" } });
  }
  const status =
    parsed.data.action === "START_REVIEW"
      ? "UNDER_REVIEW"
      : parsed.data.action === "REQUEST_CHANGES"
        ? "CHANGE_REQUESTED"
        : parsed.data.action === "APPROVE"
          ? "APPROVED"
          : "REJECTED";
  const app = await prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id },
      data: {
        status,
        approvedAt: status === "APPROVED" ? new Date() : undefined,
        rejectedAt: status === "REJECTED" ? new Date() : undefined,
      },
    });
    await tx.applicationReview.create({
      data: {
        applicationId: updated.id,
        reviewerId: req.auth!.userId,
        action: parsed.data.action,
        message: parsed.data.message,
      },
    });
    return updated;
  });
  return res.json({ data: app });
});
