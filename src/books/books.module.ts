import { Module } from '@nestjs/common';
import { ImageProcessingModule } from '@/common/image/image-processing.module';
import { PriceFeedModule } from '@/price-feed/price-feed.module';
import { StorageModule } from '@/storage/storage.module';
import { WalletModule } from '@/wallet/wallet.module';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
	imports: [
		StorageModule,
		WalletModule,
		PriceFeedModule,
		ImageProcessingModule,
	],
	controllers: [BooksController],
	providers: [BooksService],
	exports: [BooksService],
})
export class BooksModule {}
