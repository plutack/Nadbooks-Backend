import { Module } from '@nestjs/common';
import { OrderService } from '../shared/order.service';
import { TransactionService } from '@/payments/shared/transaction.service';
import { WalletService } from '@/wallet/wallet.service';
import { PrismaService } from '@/prisma/prisma.service';
import { OrderPaymentService } from '@/payments/order-payment/order-payment.service';

@Module({
	providers: [
		OrderPaymentService,
		OrderService,
		TransactionService,
		WalletService,
		PrismaService,
	],
	exports: [OrderPaymentService],
})
export class OrderPaymentModule {}
