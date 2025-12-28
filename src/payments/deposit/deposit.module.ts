import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DepositController } from '@/payments/deposit/deposit.controller';
import { DepositService } from '@/payments/deposit/deposit.service';
import { CryptoDepositProvider } from '@/payments/deposit/providers/crypto-deposit.provider';
import { PaystackDepositProvider } from '@/payments/deposit/providers/paystack-deposit.provider';
import { SharedPaymentsModule } from '@/payments/shared/shared-payments.module';
import { PriceFeedModule } from '@/price-feed/price-feed.module';
import { WalletModule } from '@/wallet/wallet.module';

@Module({
	imports: [
		HttpModule,
		WalletModule,
		PriceFeedModule,
		SharedPaymentsModule,
	],
	controllers: [DepositController],
	providers: [DepositService, PaystackDepositProvider, CryptoDepositProvider],
	exports: [DepositService],
})
export class DepositModule {}
