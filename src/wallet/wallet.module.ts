import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WalletService } from '@/wallet/wallet.service';

@Module({
	imports: [],
	providers: [PrismaService, WalletService],
	exports: [WalletService],
})
export class WalletModule {}
