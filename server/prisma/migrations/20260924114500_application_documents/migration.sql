-- CreateTable
CREATE TABLE `ApplicationDocument` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `docType` VARCHAR(40) NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(120) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `storageKey` VARCHAR(500) NOT NULL,
    `status` ENUM('UPLOADED', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'UPLOADED',
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ApplicationDocument_applicationId_docType_key`(`applicationId`, `docType`),
    INDEX `ApplicationDocument_applicationId_idx`(`applicationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ApplicationDocument` ADD CONSTRAINT `ApplicationDocument_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
