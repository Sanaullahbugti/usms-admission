-- Allow the same BS program on multiple preference ranks; add CGPA on education rows.
ALTER TABLE `ApplicationProgramChoice` DROP INDEX `ApplicationProgramChoice_applicationId_programOfferingId_key`;

ALTER TABLE `ApplicationEducation` MODIFY `level` VARCHAR(20) NOT NULL;
ALTER TABLE `ApplicationEducation` ADD COLUMN `cgpa` VARCHAR(20) NULL;
