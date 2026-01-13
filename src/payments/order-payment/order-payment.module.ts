import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CryptoDepositProvider } from '@/payments/deposit/providers/crypto-deposit.provider';
import { PaystackDepositProvider } from '@/payments/deposit/providers/paystack-deposit.provider';
import { OrderPaymentService } from '@/payments/order-payment/order-payment.service';
import { SharedPaymentsModule } from '@/payments/shared/shared-payments.module';
import { WalletModule } from '@/wallet/wallet.module';

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
