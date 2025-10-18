import { Module } from '@nestjs/common';
import { PaymentsModule } from '@/payments/payments.module';
import { PriceFeedModule } from '@/price-feed/price-feed.module';
import { PrismaService } from '@/prisma/prisma.service';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
	imports: [PaymentsModule, PriceFeedModule],
	controllers: [WalletController],
	providers: [PrismaService, WalletService],
	exports: [WalletService],
})
export class WalletModule {}
