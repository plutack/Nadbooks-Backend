import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SharedPaymentsModule } from '@/payments/shared/shared-payments.module';
import { CryptoWithdrawalProvider } from '@/payments/withdrawal/providers/crypto-withdrawal.provider';
import { PaystackWithdrawalProvider } from '@/payments/withdrawal/providers/paystack-withdrawal.provider';
import { WithdrawalController } from '@/payments/withdrawal/withdrawal.controller';
import { WithdrawalService } from '@/payments/withdrawal/withdrawal.service';
import { PriceFeedModule } from '@/price-feed/price-feed.module';
import { WalletModule } from '@/wallet/wallet.module';

@Module({
	imports: [WalletModule, PriceFeedModule, HttpModule, SharedPaymentsModule],
	providers: [
		WithdrawalService,
		PaystackWithdrawalProvider,
		CryptoWithdrawalProvider,
	],
	exports: [WithdrawalService],
	controllers: [WithdrawalController],
})
export class WithdrawalModule {}
