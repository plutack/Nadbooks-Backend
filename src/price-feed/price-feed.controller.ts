import { Controller, Get, Query } from '@nestjs/common';
import { GetConversionPreviewDto } from '@/price-feed/dtos/price-feed.dto';
import { PriceFeedService } from './price-feed.service';

@Controller('price-feed')
export class PriceFeedController {
	constructor(private readonly priceFeedService: PriceFeedService) {}

	@Get('preview')
	getConversionPreview(@Query() query: GetConversionPreviewDto) {
		return this.priceFeedService.getConversionPreview(
			query.amount,
			query.direction,
		);
	}
}
