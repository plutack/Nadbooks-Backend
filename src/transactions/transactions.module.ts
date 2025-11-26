import { Module } from '@nestjs/common';
import { SharedPaymentsModule } from '@/payments/shared/shared-payments.module';
import { TransactionService } from '@/payments/shared/transaction.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { TransactionsController } from '@/transactions/transactions.controller';

@Module({
	imports: [SharedPaymentsModule, PrismaModule],
	controllers: [TransactionsController],
	providers: [TransactionService],
})
export class TransactionsModule {}
