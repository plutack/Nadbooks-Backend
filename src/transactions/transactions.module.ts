import { Module } from '@nestjs/common';
import { SharedPaymentsModule } from '@/payments/shared/shared-payments.module';
import { TransactionService } from '@/payments/shared/transaction.service';
import { TransactionsController } from '@/transactions/transactions.controller';

@Module({
	imports: [SharedPaymentsModule],
	controllers: [TransactionsController],
	providers: [TransactionService],	
})
export class TransactionsModule {}
