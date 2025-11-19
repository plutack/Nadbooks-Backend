import { Type } from 'class-transformer';
import { ConversionDirection } from '@/price-feed/price-feed.service';

export class GetConversionPreviewDto {
	@Type(() => Number)
	amount: number;

	direction: ConversionDirection;
}
