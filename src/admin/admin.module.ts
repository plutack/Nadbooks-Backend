import { Module } from '@nestjs/common';
import { BooksModule } from '@/books/books.module';
import { UserModule } from '@/users/users.module';
import { AdminBooksController } from '@/admin/controllers/books/books.controller';
import { AdminUsersController } from '@/admin/controllers/users/users.controller';
import { AdminTransactionsController } from '@/admin/controllers/transactions/transactions.controller';
import { AdminOrdersController } from '@/admin/controllers/orders/orders.controller';
import { SharedPaymentsModule } from '@/payments/shared/shared-payments.module';

@Module({
	imports: [UserModule, BooksModule, SharedPaymentsModule],
	controllers: [
		AdminBooksController,
		AdminUsersController,
		AdminTransactionsController,
		AdminOrdersController,
	],
})
export class AdminModule {}
