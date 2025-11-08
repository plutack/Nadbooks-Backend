import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TransactionService } from '@/payments/shared/transaction.service';
import { WithdrawalService } from '@/payments/withdrawal/withdrawal.service';
import { PriceFeedModule } from '@/price-feed/price-feed.module';
import { PrismaService } from '@/prisma/prisma.service';
import { WalletModule } from '@/wallet/wallet.module';
import { PaystackWithdrawalProvider } from './providers/paystack-withdrawal.provider';

@Module({
	imports: [WalletModule, PriceFeedModule, HttpModule],
	providers: [
		WithdrawalService,
		PrismaService,
		TransactionService,
		PaystackWithdrawalProvider,
	],
	exports: [WithdrawalService],
})
export class WithdrawalModule {}
