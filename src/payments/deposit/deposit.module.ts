import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DepositController } from '@/payments/deposit/deposit.controller';
import { PriceFeedModule } from '@/price-feed/price-feed.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { WalletModule } from '@/wallet/wallet.module';
import { DepositService } from './deposit.service';
import { PaystackDepositProvider } from './providers/paystack-deposit.provider';

@Module({
	imports: [HttpModule, PrismaModule, WalletModule, PriceFeedModule],
	controllers: [DepositController],
	providers: [DepositService, PaystackDepositProvider],
	exports: [DepositService],
})
export class DepositModule {}
