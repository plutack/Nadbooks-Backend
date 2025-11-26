import {
	Controller,
	Get,
	NotFoundException,
	Param,
	Query,
	UseGuards,
} from '@nestjs/common';
import { Role } from 'generated/prisma';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';
import { TransactionService } from '@/payments/shared/transaction.service';
import { JwtPayloadType } from '@/types/jwt.type';

@Controller('transactions')
@UseGuards(AuthGuard)
export class TransactionsController {
	constructor(private readonly transactionService: TransactionService) {}

	// Admin: can fetch all transactions or transactions for a specific user
	// Regular users: fetch only their own transactions
	@Get()
	async getTransactions(
		@Query('userId') userId: string | undefined,
		@CurrentUser() user: JwtPayloadType,
	) {
		if (user.role === Role.ADMIN) {
			// Admin can get all transactions or transactions for a specific user
			if (userId) {
				return await this.transactionService.getTransactionsByUser(userId);
			}
			return await this.transactionService.getAllTransactions();
		}

		// Regular user: fetch own transactions only
		return this.transactionService.getTransactionsByUser(user.sub);
	}

	// Admin: can fetch any transaction by reference
	// Regular users: can fetch only their own transactions by reference
	@Get(':reference')
	async getTransaction(
		@Param('reference') reference: string,
		@CurrentUser() user: JwtPayloadType,
	) {
		const transaction =
			await this.transactionService.getTransactionByReference(reference);

		if (!transaction) {
			throw new NotFoundException('Transaction not found');
		}

		// Regular user: ensure they can only access their own transaction
		if (user.role !== Role.ADMIN) {
			const isOwner =
				transaction.senderWallet?.userId === user.sub ||
				transaction.recipientWallet?.userId === user.sub;

			if (!isOwner) {
				throw new NotFoundException('Transaction not found');
			}
		}

		return transaction;
	}
}
