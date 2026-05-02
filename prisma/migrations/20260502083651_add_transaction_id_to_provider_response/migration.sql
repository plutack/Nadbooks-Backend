-- AlterTable
ALTER TABLE `ProviderResponse` ADD COLUMN `transaction_id` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `ProviderResponse` ADD CONSTRAINT `ProviderResponse_transaction_id_fkey` FOREIGN KEY (`transaction_id`) REFERENCES `Transaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
