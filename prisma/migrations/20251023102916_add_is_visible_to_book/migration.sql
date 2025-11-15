/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Book` ADD COLUMN `is_visible` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `role`;
