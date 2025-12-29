import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class BaseFilterDto {
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	limit?: number = 20;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	skip?: number = 0;
}
