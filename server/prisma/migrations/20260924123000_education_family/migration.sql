-- AlterTable (idempotent-friendly for environments that already have columns)
-- Columns may already exist if ensureDraftSchema ran first; migrate resolve handles failed apply.

ALTER TABLE `ApplicantProfile`
  ADD COLUMN `householdIncome` VARCHAR(120) NULL,
  ADD COLUMN `emergencyContact` VARCHAR(160) NULL,
  ADD COLUMN `emergencyPhone` VARCHAR(20) NULL,
  ADD COLUMN `hasSibling` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `siblingName` VARCHAR(120) NULL,
  ADD COLUMN `siblingRegNo` VARCHAR(60) NULL;

-- CreateTable
CREATE TABLE `ApplicationEducation` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `level` VARCHAR(10) NOT NULL,
    `group` VARCHAR(80) NULL,
    `board` VARCHAR(120) NULL,
    `year` VARCHAR(10) NULL,
    `obtainedMarks` VARCHAR(20) NULL,
    `totalMarks` VARCHAR(20) NULL,
    `rollNumber` VARCHAR(60) NULL,
    `institutionType` VARCHAR(80) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ApplicationEducation_applicationId_level_key`(`applicationId`, `level`),
    INDEX `ApplicationEducation_applicationId_idx`(`applicationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ApplicationEducation` ADD CONSTRAINT `ApplicationEducation_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
