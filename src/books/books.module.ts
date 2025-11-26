import { Module } from '@nestjs/common';
import { PriceFeedModule } from '@/price-feed/price-feed.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { StorageModule } from '@/storage/storage.module';
import { WalletModule } from '@/wallet/wallet.module';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
	imports: [PrismaModule, StorageModule, WalletModule, PriceFeedModule],
	controllers: [BooksController],
	providers: [BooksService],
})
export class BooksModule {}
