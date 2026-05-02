import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PriceFeedController } from '@/price-feed/price-feed.controller';
import { PriceFeedService } from '@/price-feed/price-feed.service';
import { PriceCacheService } from '@/price-feed/price-cache.service';
import { DexPriceService } from '@/price-feed/providers/dex-price.provider';
import { FiatPriceConvertService } from '@/price-feed/providers/fiat-price.provider';

@Module({
	imports: [HttpModule],
	providers: [
		PriceFeedService,
		PriceCacheService, // background worker — runs on module init
		DexPriceService,
		FiatPriceConvertService,
	],
	exports: [PriceFeedService],
	controllers: [PriceFeedController],
})
export class PriceFeedModule {}
