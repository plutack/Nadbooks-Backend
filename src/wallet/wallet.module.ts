import { Module } from '@nestjs/common';
import { WalletService } from '@/wallet/wallet.service';

@Module({
	imports: [],
	providers: [WalletService],
	exports: [WalletService],
})
export class WalletModule {}
