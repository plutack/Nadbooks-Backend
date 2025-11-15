import {
	IsBoolean,
	IsInt,
	IsNumber,
	IsOptional,
	IsString,
} from 'class-validator';

export  class AdminEditBookDto {
	@IsOptional()
	@IsString()
	genre: string;

	@IsOptional()
	@IsNumber()
	price: number;

	@IsOptional()
	@IsBoolean()
	isMature: boolean;

	@IsOptional()
	@IsInt()
	pageCount: number;
}
