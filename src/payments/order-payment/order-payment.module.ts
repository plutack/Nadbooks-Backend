import { Module } from '@nestjs/common';
import { OrderPaymentService } from '@/payments/order-payment/order-payment.service';
import { WalletModule } from '@/wallet/wallet.module';
import { SharedPaymentsModule } from '@/payments/shared/shared-payments.module';
import { PaystackDepositProvider } from '@/payments/deposit/providers/paystack-deposit.provider';
import { CryptoDepositProvider } from '@/payments/deposit/providers/crypto-deposit.provider';
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [SharedPaymentsModule, WalletModule, HttpModule],
	providers: [
		OrderPaymentService,
		PaystackDepositProvider,
		CryptoDepositProvider,
	],
	exports: [OrderPaymentService],
})
export class OrderPaymentModule {}
