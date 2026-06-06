import { Module } from '@nestjs/common';
import { AdminBooksController } from '@/admin/controllers/books/books.controller';
import { AdminOrdersController } from '@/admin/controllers/orders/orders.controller';
import { AdminSecurityController } from '@/admin/controllers/security/security.controller';
import { AdminStatsController } from '@/admin/controllers/stats/stats.controller';
import { AdminTransactionsController } from '@/admin/controllers/transactions/transactions.controller';
import { AdminUsersController } from '@/admin/controllers/users/users.controller';
import { AdminStatsService } from '@/admin/services/admin-stats.service';
import { BooksModule } from '@/books/books.module';
import { SharedPaymentsModule } from '@/payments/shared/shared-payments.module';
import { UserModule } from '@/users/users.module';

@Module({
	imports: [UserModule, BooksModule, SharedPaymentsModule],
	controllers: [
		AdminBooksController,
		AdminUsersController,
		AdminTransactionsController,
		AdminOrdersController,
		AdminSecurityController,
		AdminStatsController,
	],
	providers: [AdminStatsService],
})
export class AdminModule {}
