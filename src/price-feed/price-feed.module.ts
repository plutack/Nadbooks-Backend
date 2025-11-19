import { Module } from '@nestjs/common';
import { PriceFeedService } from './price-feed.service';
import { PriceFeedController } from './price-feed.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [HttpModule],
	providers: [PriceFeedService],
	exports: [PriceFeedService],
	controllers: [PriceFeedController],
})
export class PriceFeedModule {}
