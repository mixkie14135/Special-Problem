/*
  Warnings:

  - Added the required column `contactEmail` to the `ServiceRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactFirstName` to the `ServiceRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactLastName` to the `ServiceRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactPhone` to the `ServiceRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `portfolio` ADD COLUMN `occurredAt` DATETIME(3) NULL,
    ADD COLUMN `timeNote` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `servicecategory` ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `iconUrl` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `servicerequest` ADD COLUMN `addressLine` VARCHAR(191) NULL,
    ADD COLUMN `contactEmail` VARCHAR(191) NOT NULL,
    ADD COLUMN `contactFirstName` VARCHAR(191) NOT NULL,
    ADD COLUMN `contactLastName` VARCHAR(191) NOT NULL,
    ADD COLUMN `contactPhone` VARCHAR(191) NOT NULL,
    ADD COLUMN `district` VARCHAR(191) NULL,
    ADD COLUMN `formattedAddress` VARCHAR(191) NULL,
    ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL,
    ADD COLUMN `placeId` VARCHAR(191) NULL,
    ADD COLUMN `placeName` VARCHAR(191) NULL,
    ADD COLUMN `postalCode` VARCHAR(191) NULL,
    ADD COLUMN `province` VARCHAR(191) NULL,
    ADD COLUMN `subdistrict` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `phone` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `RequestImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` INTEGER NOT NULL,
    `imageUrl` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RequestImage_requestId_idx`(`requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RequestImage` ADD CONSTRAINT `RequestImage_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `ServiceRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
