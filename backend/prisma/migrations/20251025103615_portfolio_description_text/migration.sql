/*
  Warnings:

  - Made the column `description` on table `portfolio` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `portfolio` MODIFY `description` TEXT NOT NULL;
