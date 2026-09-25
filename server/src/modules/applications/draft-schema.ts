import { prisma } from "../../database/prisma.js";

let schemaReady: Promise<void> | null = null;

async function addColumnIfMissing(table: string, column: string, definition: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ Field: string }>>(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`);
  if (rows.length === 0) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
  }
}

async function dropIndexIfExists(table: string, indexName: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ Key_name: string }>>(
    `SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`,
    indexName,
  );
  if (rows.length > 0) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` DROP INDEX \`${indexName}\``);
  }
}

async function widenColumnIfNeeded(table: string, column: string, definition: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ Type: string }>>(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`);
  const type = rows[0]?.Type?.toLowerCase() ?? "";
  if (type.includes("varchar(10)")) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` MODIFY \`${column}\` ${definition}`);
  }
}

/** Ensures family columns + ApplicationEducation exist (cPanel cannot always run migrate). */
export function ensureDraftSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await addColumnIfMissing("ApplicantProfile", "householdIncome", "`householdIncome` VARCHAR(120) NULL");
      await addColumnIfMissing("ApplicantProfile", "emergencyContact", "`emergencyContact` VARCHAR(160) NULL");
      await addColumnIfMissing("ApplicantProfile", "emergencyPhone", "`emergencyPhone` VARCHAR(20) NULL");
      await addColumnIfMissing("ApplicantProfile", "hasSibling", "`hasSibling` BOOLEAN NOT NULL DEFAULT false");
      await addColumnIfMissing("ApplicantProfile", "siblingName", "`siblingName` VARCHAR(120) NULL");
      await addColumnIfMissing("ApplicantProfile", "siblingRegNo", "`siblingRegNo` VARCHAR(60) NULL");

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`ApplicationEducation\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`applicationId\` VARCHAR(191) NOT NULL,
          \`level\` VARCHAR(20) NOT NULL,
          \`group\` VARCHAR(80) NULL,
          \`board\` VARCHAR(120) NULL,
          \`year\` VARCHAR(10) NULL,
          \`obtainedMarks\` VARCHAR(20) NULL,
          \`totalMarks\` VARCHAR(20) NULL,
          \`cgpa\` VARCHAR(20) NULL,
          \`rollNumber\` VARCHAR(60) NULL,
          \`institutionType\` VARCHAR(80) NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL,
          UNIQUE INDEX \`ApplicationEducation_applicationId_level_key\`(\`applicationId\`, \`level\`),
          INDEX \`ApplicationEducation_applicationId_idx\`(\`applicationId\`),
          PRIMARY KEY (\`id\`),
          CONSTRAINT \`ApplicationEducation_applicationId_fkey\`
            FOREIGN KEY (\`applicationId\`) REFERENCES \`Application\`(\`id\`)
            ON DELETE CASCADE ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      await widenColumnIfNeeded("ApplicationEducation", "level", "VARCHAR(20) NOT NULL");
      await addColumnIfMissing("ApplicationEducation", "cgpa", "`cgpa` VARCHAR(20) NULL");
      await dropIndexIfExists("ApplicationProgramChoice", "ApplicationProgramChoice_applicationId_programOfferingId_key");

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

      await prisma.$executeRawUnsafe(
        `UPDATE \`AdmissionCycle\` SET \`academicYear\` = '2027', \`name\` = 'Undergraduate Admissions 2027' WHERE \`status\` = 'OPEN'`,
      );
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}
