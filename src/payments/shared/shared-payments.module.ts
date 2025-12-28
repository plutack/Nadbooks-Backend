import { Module } from '@nestjs/common';
import { OrderService } from '@/payments/shared/order.service';
import { TransactionService } from '@/payments/shared/transaction.service';

@Module({
	providers: [TransactionService, OrderService],
	exports: [TransactionService, OrderService],
})
export class SharedPaymentsModule {}
