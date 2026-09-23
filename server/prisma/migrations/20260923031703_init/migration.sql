-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGE_REQUESTED', 'RESUBMITTED', 'DOCUMENTS_VERIFIED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AdmissionCycleStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionCycle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "status" "AdmissionCycleStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramOffering" (
    "id" TEXT NOT NULL,
    "admissionCycleId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "minimumPercentage" DECIMAL(5,2),
    "availableSeats" INTEGER,
    "applicationFee" DECIMAL(10,2),
    "isOpen" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProgramOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "applicationNo" TEXT,
    "userId" TEXT NOT NULL,
    "admissionCycleId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicantProfile" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "fatherName" TEXT NOT NULL,
    "guardianName" TEXT,
    "surname" TEXT,
    "gender" TEXT,
    "fatherOccupation" TEXT,
    "mobile" TEXT,
    "domicileDistrict" TEXT,
    "nationality" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "email" TEXT,
    "province" TEXT,
    "cnicBform" TEXT,
    "postalAddress" TEXT,
    "residentialAddress" TEXT,

    CONSTRAINT "ApplicantProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationProgramChoice" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "programOfferingId" TEXT NOT NULL,
    "preferenceOrder" INTEGER NOT NULL,

    CONSTRAINT "ApplicationProgramChoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Program_code_key" ON "Program"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramOffering_admissionCycleId_programId_key" ON "ProgramOffering"("admissionCycleId", "programId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_applicationNo_key" ON "Application"("applicationNo");

-- CreateIndex
CREATE INDEX "Application_admissionCycleId_status_idx" ON "Application"("admissionCycleId", "status");

-- CreateIndex
CREATE INDEX "Application_userId_idx" ON "Application"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicantProfile_applicationId_key" ON "ApplicantProfile"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationProgramChoice_applicationId_preferenceOrder_key" ON "ApplicationProgramChoice"("applicationId", "preferenceOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationProgramChoice_applicationId_programOfferingId_key" ON "ApplicationProgramChoice"("applicationId", "programOfferingId");

-- AddForeignKey
ALTER TABLE "ProgramOffering" ADD CONSTRAINT "ProgramOffering_admissionCycleId_fkey" FOREIGN KEY ("admissionCycleId") REFERENCES "AdmissionCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramOffering" ADD CONSTRAINT "ProgramOffering_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_admissionCycleId_fkey" FOREIGN KEY ("admissionCycleId") REFERENCES "AdmissionCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicantProfile" ADD CONSTRAINT "ApplicantProfile_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationProgramChoice" ADD CONSTRAINT "ApplicationProgramChoice_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationProgramChoice" ADD CONSTRAINT "ApplicationProgramChoice_programOfferingId_fkey" FOREIGN KEY ("programOfferingId") REFERENCES "ProgramOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
