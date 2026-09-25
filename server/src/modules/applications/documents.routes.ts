import { createReadStream, existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../../database/prisma.js";
import { applicationUploadKey, ensureUploadsDir, resolveUploadPath } from "../../lib/storage.js";
import { requireAuth, requirePermission, type AuthRequest } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rateLimit.js";

export const documentsRouter = Router();

const DOC_TYPES = ["SSC", "HSC", "CNIC", "DOMICILE", "PHOTO", "CHALLAN"] as const;
type DocType = (typeof DOC_TYPES)[number];

const docTypeSchema = z.enum(DOC_TYPES);
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/jpg"]);
const ALLOWED_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png"]);
const MAX_BYTES = 5 * 1024 * 1024;

type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

type SniffedFile = {
  mime: string;
  ext: ".pdf" | ".jpg" | ".png";
};

function extensionOf(name: string) {
  const base = basename(name).toLowerCase();
  const dot = base.lastIndexOf(".");
  if (dot < 0) return "";
  return base.slice(dot);
}

function sniffUpload(buffer: Buffer): SniffedFile | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    return { mime: "application/pdf", ext: ".pdf" };
  }
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { mime: "application/pdf", ext: ".pdf" };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: ".jpg" };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: "image/png", ext: ".png" };
  }
  return null;
}

function safeDocumentName(originalName: string, ext: SniffedFile["ext"]) {
  const rawBase = basename(originalName).replace(/\.[^.]+$/i, "");
  const safeBase = rawBase.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "").slice(0, 80) || "document";
  return `${safeBase}${ext}`;
}

function isAllowedUpload(file: UploadedFile): { ok: true; sniffed: SniffedFile; safeName: string } | { ok: false; message: string } {
  if (!file.buffer.length) {
    return { ok: false, message: "The uploaded file is empty" };
  }
  const ext = extensionOf(file.originalname);
  if (!ALLOWED_EXT.has(ext)) {
    return { ok: false, message: "Only PDF, JPG, and PNG files are allowed" };
  }
  // Block double extensions such as document.pdf.js / photo.png.html
  const lower = basename(file.originalname).toLowerCase();
  if ((lower.match(/\./g) ?? []).length > 1) {
    const withoutFinal = lower.slice(0, lower.lastIndexOf("."));
    if (/\.(php|phtml|asp|aspx|js|mjs|cjs|html|htm|shtml|svg|exe|sh|bat|cmd|dll|jar|py|rb|pl|cgi|jsp)$/i.test(withoutFinal)) {
      return { ok: false, message: "Only PDF, JPG, and PNG files are allowed" };
    }
  }
  const sniffed = sniffUpload(file.buffer);
  if (!sniffed) {
    return { ok: false, message: "File content is not a valid PDF, JPG, or PNG" };
  }
  if (ext === ".pdf" && sniffed.ext !== ".pdf") {
    return { ok: false, message: "File extension does not match the file contents" };
  }
  if ((ext === ".jpg" || ext === ".jpeg" || ext === ".png") && sniffed.ext === ".pdf") {
    return { ok: false, message: "File extension does not match the file contents" };
  }
  if (file.mimetype && !ALLOWED_MIME.has(file.mimetype.toLowerCase())) {
    return { ok: false, message: "Only PDF, JPG, and PNG files are allowed" };
  }
  return { ok: true, sniffed, safeName: safeDocumentName(file.originalname, sniffed.ext) };
}

type DocRow = {
  id: string;
  docType: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  status: string;
  uploadedAt: Date;
};

let tableReady: Promise<void> | null = null;

function ensureDocumentTable() {
  if (!tableReady) {
    tableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`ApplicationDocument\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`applicationId\` VARCHAR(191) NOT NULL,
          \`docType\` VARCHAR(40) NOT NULL,
          \`originalName\` VARCHAR(255) NOT NULL,
          \`mimeType\` VARCHAR(120) NOT NULL,
          \`sizeBytes\` INTEGER NOT NULL,
          \`storageKey\` VARCHAR(500) NOT NULL,
          \`status\` ENUM('UPLOADED', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'UPLOADED',
          \`uploadedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL,
          UNIQUE INDEX \`ApplicationDocument_applicationId_docType_key\`(\`applicationId\`, \`docType\`),
          INDEX \`ApplicationDocument_applicationId_idx\`(\`applicationId\`),
          PRIMARY KEY (\`id\`),
          CONSTRAINT \`ApplicationDocument_applicationId_fkey\`
            FOREIGN KEY (\`applicationId\`) REFERENCES \`Application\`(\`id\`)
            ON DELETE CASCADE ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
    })().catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  return tableReady;
}

async function readMultipartFile(req: AuthRequest): Promise<UploadedFile | null> {
  const contentType = String(req.headers["content-type"] ?? "");
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  if (!boundaryMatch) {
    throw new Error("Expected multipart form upload");
  }
  const boundary = boundaryMatch[1] ?? boundaryMatch[2];
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req as unknown as AsyncIterable<Buffer>) {
    total += chunk.length;
    if (total > MAX_BYTES + 64_000) {
      throw new Error("File too large");
    }
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks);
  const delimiter = Buffer.from(`--${boundary}`);
  let start = body.indexOf(delimiter);
  if (start < 0) {
    return null;
  }
  start += delimiter.length;
  if (body[start] === 45 && body[start + 1] === 45) {
    return null;
  }
  if (body[start] === 13 && body[start + 1] === 10) {
    start += 2;
  }

  while (start < body.length) {
    const next = body.indexOf(delimiter, start);
    const partEnd = next < 0 ? body.length : next;
    let part = body.subarray(start, partEnd);
    if (part.length >= 2 && part[0] === 13 && part[1] === 10) {
      part = part.subarray(2);
    }
    if (part.length >= 2 && part[part.length - 2] === 13 && part[part.length - 1] === 10) {
      part = part.subarray(0, part.length - 2);
    }
    const headerSep = part.indexOf("\r\n\r\n");
    if (headerSep >= 0) {
      const headerText = part.subarray(0, headerSep).toString("utf8");
      const fileData = part.subarray(headerSep + 4);
      const nameMatch = /name="([^"]+)"/i.exec(headerText);
      const filenameMatch = /filename="([^"]*)"/i.exec(headerText);
      const typeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headerText);
      if (nameMatch?.[1] === "file" && filenameMatch) {
        const mimetype = (typeMatch?.[1] ?? "application/octet-stream").trim().toLowerCase();
        return {
          originalname: filenameMatch[1] || "upload.bin",
          mimetype,
          size: fileData.length,
          buffer: Buffer.from(fileData),
        };
      }
    }
    if (next < 0) {
      break;
    }
    start = next + delimiter.length;
    if (body[start] === 45 && body[start + 1] === 45) {
      break;
    }
    if (body[start] === 13 && body[start + 1] === 10) {
      start += 2;
    }
  }
  return null;
}

const captureFile: RequestHandler = async (req, res, next) => {
  try {
    const file = await readMultipartFile(req as AuthRequest);
    (req as AuthRequest & { uploadedFile?: UploadedFile | null }).uploadedFile = file;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    if (message.includes("File too large")) {
      return res.status(400).json({ error: { code: "FILE_TOO_LARGE", message: "Each file must be 5 MB or smaller" } });
    }
    return res.status(400).json({ error: { code: "UPLOAD_ERROR", message } });
  }
};

async function ownApplication(userId: string) {
  return prisma.application.findFirst({
    where: { userId },
    select: { id: true, applicationNo: true },
  });
}

function toPublicDoc(doc: DocRow) {
  const sizeLabel =
    doc.sizeBytes >= 1024 * 1024
      ? `${(doc.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(doc.sizeBytes / 1024))} KB`;
  return {
    id: doc.id,
    docType: doc.docType,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    sizeLabel,
    status: doc.status,
    uploadedAt: new Date(doc.uploadedAt).toISOString(),
  };
}

async function listDocs(applicationId: string) {
  return prisma.$queryRawUnsafe<DocRow[]>(
    `SELECT id, docType, originalName, mimeType, sizeBytes, storageKey, status, uploadedAt
     FROM ApplicationDocument WHERE applicationId = ? ORDER BY uploadedAt ASC`,
    applicationId,
  );
}

async function findDoc(applicationId: string, docType: string) {
  const rows = await prisma.$queryRawUnsafe<DocRow[]>(
    `SELECT id, docType, originalName, mimeType, sizeBytes, storageKey, status, uploadedAt
     FROM ApplicationDocument WHERE applicationId = ? AND docType = ? LIMIT 1`,
    applicationId,
    docType,
  );
  return rows[0] ?? null;
}

async function upsertDoc(input: {
  applicationId: string;
  docType: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
}) {
  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO ApplicationDocument
      (id, applicationId, docType, originalName, mimeType, sizeBytes, storageKey, status, uploadedAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'UPLOADED', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
      originalName = VALUES(originalName),
      mimeType = VALUES(mimeType),
      sizeBytes = VALUES(sizeBytes),
      storageKey = VALUES(storageKey),
      status = 'UPLOADED',
      uploadedAt = CURRENT_TIMESTAMP(3),
      updatedAt = CURRENT_TIMESTAMP(3)`,
    id,
    input.applicationId,
    input.docType,
    input.originalName,
    input.mimeType,
    input.sizeBytes,
    input.storageKey,
  );
  const saved = await findDoc(input.applicationId, input.docType);
  if (!saved) {
    throw new Error("Document metadata was not saved");
  }
  return saved;
}

documentsRouter.get("/me/documents", requireAuth, async (req: AuthRequest, res) => {
  await ensureDocumentTable();
  const app = await ownApplication(req.auth!.userId);
  if (!app) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Application not found" } });
  }
  const docs = await listDocs(app.id);
  return res.json({ data: docs.map(toPublicDoc) });
});

documentsRouter.post(
  "/me/documents/:docType",
  requireAuth,
  rateLimit(20, 60_000),
  captureFile,
  async (req: AuthRequest, res) => {
    await ensureDocumentTable();
    const parsedType = docTypeSchema.safeParse(String(req.params.docType ?? "").toUpperCase());
    if (!parsedType.success) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Unknown document type" } });
    }
    const docType: DocType = parsedType.data;
    const file = (req as AuthRequest & { uploadedFile?: UploadedFile | null }).uploadedFile;
    if (!file) {
      return res.status(400).json({ error: { code: "FILE_REQUIRED", message: "Choose a PDF, JPG, or PNG file" } });
    }
    if (file.size > MAX_BYTES) {
      return res.status(400).json({ error: { code: "FILE_TOO_LARGE", message: "Each file must be 5 MB or smaller" } });
    }
    const checked = isAllowedUpload(file);
    if (!checked.ok) {
      return res.status(400).json({ error: { code: "INVALID_TYPE", message: checked.message } });
    }

    const app = await ownApplication(req.auth!.userId);
    if (!app) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Application not found" } });
    }

    ensureUploadsDir();
    const storageKey = applicationUploadKey(app.id, checked.safeName);
    const absolute = resolveUploadPath(storageKey);
    mkdirSync(dirname(absolute), { recursive: true });

    const existing = await findDoc(app.id, docType);
    writeFileSync(absolute, file.buffer);

    if (existing) {
      try {
        const oldPath = resolveUploadPath(existing.storageKey);
        if (existsSync(oldPath) && oldPath !== absolute) {
          unlinkSync(oldPath);
        }
      } catch {
        // Keep the new file even if the previous object cannot be removed.
      }
    }

    const saved = await upsertDoc({
      applicationId: app.id,
      docType,
      originalName: checked.safeName,
      mimeType: checked.sniffed.mime,
      sizeBytes: file.size,
      storageKey,
    });

    return res.status(201).json({ data: toPublicDoc(saved) });
  },
);

documentsRouter.get("/me/documents/:docType/file", requireAuth, async (req: AuthRequest, res) => {
  await ensureDocumentTable();
  const parsedType = docTypeSchema.safeParse(String(req.params.docType ?? "").toUpperCase());
  if (!parsedType.success) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Unknown document type" } });
  }
  const app = await ownApplication(req.auth!.userId);
  if (!app) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Application not found" } });
  }
  const doc = await findDoc(app.id, parsedType.data);
  if (!doc) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Document not uploaded" } });
  }
  let absolute: string;
  try {
    absolute = resolveUploadPath(doc.storageKey);
  } catch {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Document file is missing" } });
  }
  if (!existsSync(absolute)) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Document file is missing" } });
  }
  res.setHeader("Content-Type", doc.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${doc.originalName.replace(/"/g, "")}"`);
  createReadStream(absolute).pipe(res);
});

documentsRouter.get(
  "/:id/documents/:docType/file",
  requireAuth,
  requirePermission("document:view"),
  async (req: AuthRequest, res) => {
    await ensureDocumentTable();
    const applicationId = typeof req.params.id === "string" ? req.params.id : "";
    const parsedType = docTypeSchema.safeParse(String(req.params.docType ?? "").toUpperCase());
    if (!applicationId) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Application id is required" } });
    }
    if (!parsedType.success) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Unknown document type" } });
    }
    const app = await prisma.application.findUnique({ where: { id: applicationId }, select: { id: true } });
    if (!app) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Application not found" } });
    }
    const doc = await findDoc(app.id, parsedType.data);
    if (!doc) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Document not uploaded" } });
    }
    let absolute: string;
    try {
      absolute = resolveUploadPath(doc.storageKey);
    } catch {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Document file is missing" } });
    }
    if (!existsSync(absolute)) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Document file is missing" } });
    }
    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${doc.originalName.replace(/"/g, "")}"`);
    createReadStream(absolute).pipe(res);
  },
);
