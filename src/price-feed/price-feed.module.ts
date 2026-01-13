import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PriceFeedController } from '@/price-feed/price-feed.controller';
import { PriceFeedService } from '@/price-feed/price-feed.service';
import { FiatPriceConvertService } from '@/price-feed/providers/fiat-price.provider';

@Module({
	imports: [HttpModule],
	providers: [PriceFeedService, FiatPriceConvertService],
	exports: [PriceFeedService],
	controllers: [PriceFeedController],
})
export class PriceFeedModule {}
