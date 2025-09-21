import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WalletService } from './wallet.service';

@Module({
	providers: [PrismaService, WalletService],
	exports: [WalletService],
})
export class WalletModule {}
