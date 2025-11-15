/*
  Warnings:

  - A unique constraint covering the columns `[user_id,book_id]` on the table `BookBookmark` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `price` to the `Book` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Book` ADD COLUMN `price` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `role` ENUM('ADMIN', 'SUPERADMIN', 'USER') NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `BookBookmark_user_id_book_id_key` ON `BookBookmark`(`user_id`, `book_id`);
