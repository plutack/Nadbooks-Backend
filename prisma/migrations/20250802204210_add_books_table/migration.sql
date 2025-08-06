-- CreateTable
CREATE TABLE `Book` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `author` VARCHAR(255) NOT NULL,
    `is_mature` BOOLEAN NOT NULL,
    `page_count` INTEGER NOT NULL,
    `book_url` VARCHAR(255) NOT NULL,
    `date_updated` DATETIME(3) NOT NULL,
    `date_authored` DATETIME(3) NOT NULL,
    `date_uploaded` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
