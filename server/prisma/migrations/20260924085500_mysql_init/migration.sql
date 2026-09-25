-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `loginId` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_loginId_key`(`loginId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permission` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Permission_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserRole` (
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`userId`, `roleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePermission` (
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`roleId`, `permissionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdmissionCycle` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `academicYear` VARCHAR(191) NOT NULL,
    `applicationPrefix` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Program` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `degreeType` VARCHAR(191) NULL,
    `durationYears` DECIMAL(3, 1) NULL,
    `department` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Program_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProgramOffering` (
    `id` VARCHAR(191) NOT NULL,
    `admissionCycleId` VARCHAR(191) NOT NULL,
    `programId` VARCHAR(191) NOT NULL,
    `minimumPercentage` DECIMAL(5, 2) NULL,
    `minimumEducationYears` INTEGER NULL,
    `availableSeats` INTEGER NULL,
    `applicationFee` DECIMAL(10, 2) NULL,
    `isOpen` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `ProgramOffering_admissionCycleId_programId_key`(`admissionCycleId`, `programId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Application` (
    `id` VARCHAR(191) NOT NULL,
    `applicationNo` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `admissionCycleId` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGE_REQUESTED', 'RESUBMITTED', 'DOCUMENTS_VERIFIED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `paymentStatus` ENUM('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `version` INTEGER NOT NULL DEFAULT 1,
    `submittedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Application_applicationNo_key`(`applicationNo`),
    INDEX `Application_admissionCycleId_status_idx`(`admissionCycleId`, `status`),
    INDEX `Application_userId_idx`(`userId`),
    UNIQUE INDEX `Application_userId_admissionCycleId_key`(`userId`, `admissionCycleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApplicationReview` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `reviewerId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `message` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ApplicationReview_applicationId_createdAt_idx`(`applicationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApplicantProfile` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `applicantName` VARCHAR(120) NOT NULL,
    `fatherName` VARCHAR(120) NOT NULL,
    `guardianName` VARCHAR(120) NULL,
    `surname` VARCHAR(120) NULL,
    `gender` VARCHAR(20) NULL,
    `fatherOccupation` VARCHAR(120) NULL,
    `mobile` VARCHAR(20) NULL,
    `domicileDistrict` VARCHAR(80) NULL,
    `nationality` VARCHAR(80) NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `email` VARCHAR(191) NULL,
    `province` VARCHAR(80) NULL,
    `cnicBform` VARCHAR(20) NULL,
    `postalAddress` VARCHAR(300) NULL,
    `residentialAddress` VARCHAR(300) NULL,

    UNIQUE INDEX `ApplicantProfile_applicationId_key`(`applicationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApplicationProgramChoice` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `programOfferingId` VARCHAR(191) NOT NULL,
    `preferenceOrder` INTEGER NOT NULL,

    UNIQUE INDEX `ApplicationProgramChoice_applicationId_preferenceOrder_key`(`applicationId`, `preferenceOrder`),
    UNIQUE INDEX `ApplicationProgramChoice_applicationId_programOfferingId_key`(`applicationId`, `programOfferingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProgramOffering` ADD CONSTRAINT `ProgramOffering_admissionCycleId_fkey` FOREIGN KEY (`admissionCycleId`) REFERENCES `AdmissionCycle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProgramOffering` ADD CONSTRAINT `ProgramOffering_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `Program`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Application` ADD CONSTRAINT `Application_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Application` ADD CONSTRAINT `Application_admissionCycleId_fkey` FOREIGN KEY (`admissionCycleId`) REFERENCES `AdmissionCycle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationReview` ADD CONSTRAINT `ApplicationReview_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicantProfile` ADD CONSTRAINT `ApplicantProfile_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationProgramChoice` ADD CONSTRAINT `ApplicationProgramChoice_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationProgramChoice` ADD CONSTRAINT `ApplicationProgramChoice_programOfferingId_fkey` FOREIGN KEY (`programOfferingId`) REFERENCES `ProgramOffering`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

