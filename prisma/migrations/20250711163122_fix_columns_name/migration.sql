/*
  Warnings:

  - You are about to drop the column `created_at)` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at)` on the `User` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `User` DROP COLUMN `created_at)`,
    DROP COLUMN `updated_at)`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;
