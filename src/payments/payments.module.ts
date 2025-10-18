import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WalletModule } from '@/wallet/wallet.module';
import { PriceFeedModule } from '@/price-feed/price-feed.module';
import { CheckoutController } from './checkout.controller';
import { PaymentService } from './payment.service';
import { PaystackProvider } from './providers/paystack.provider';
import { CheckoutService } from './services/checkout.service';
import { OrderService } from './services/order.service';
import { TransactionService } from './services/transaction.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
	imports: [HttpModule, WalletModule, PriceFeedModule, PrismaModule],
	controllers: [CheckoutController],
	providers: [
		PaymentService,
		PaystackProvider,
		CheckoutService,
		OrderService,
		TransactionService,
	],
})
export class PaymentModule {}
