/*
  Warnings:

  - A unique constraint covering the columns `[publicRef]` on the table `ServiceRequest` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `publicRef` to the `ServiceRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `servicerequest` ADD COLUMN `publicRef` VARCHAR(32) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `ServiceRequest_publicRef_key` ON `ServiceRequest`(`publicRef`);
