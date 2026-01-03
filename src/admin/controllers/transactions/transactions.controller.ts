import { Controller, Get, Query } from '@nestjs/common';
import { TransactionStatus, TransactionType } from 'generated/prisma';
import { AdminAuth } from '@/auth/decorators/roles.decorator';
import { TransactionService } from '@/payments/shared/transaction.service';

@Controller('admin/transactions')
@AdminAuth()
export class AdminTransactionsController {
	constructor(private readonly transactionService: TransactionService) {}

	@Get()
	async getTransactions(
		@Query('userId') userId: string | undefined,
		@Query('type') type: TransactionType | undefined,
		@Query('status') status: TransactionStatus | undefined,
	) {
		const filter = { type, status };
		if (userId) {
			return await this.transactionService.getTransactionsByUser(
				userId,
				filter,
			);
		}
		return await this.transactionService.getAllTransactions(filter);
	}
}
