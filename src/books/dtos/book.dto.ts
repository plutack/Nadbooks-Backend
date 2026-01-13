import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
	IsBoolean,
	IsBooleanString,
	IsDate,
	IsInt,
	IsNotEmpty,
	IsNumberString,
	IsOptional,
	IsString,
} from 'class-validator';
import { BaseFilterDto } from '@/common/dto/filters.dto';
import * as multipartUtil from '@/helpers/dto/multipart.util';

export class StoreBookDto {
	@IsNotEmpty()
	@IsString()
	title: string;

	/** NOTE: commented this out because since authors should always be a user.
	 We might as well dynamically generate this. */

	// @IsNotEmpty()
	// @IsString()
	// author: string;

	@IsNotEmpty()
	@IsString()
	genre: string;

	@IsNotEmpty()
	@IsNumberString()
	price: number;

	@IsNotEmpty()
	@IsBooleanString()
	isMature: boolean;

	@IsNotEmpty()
	@IsDate()
	@Type(() => Date)
	dateAuthored: Date;
}

export class UpdateBookDto extends PartialType(StoreBookDto) {}

export const StoreBookMultipartDto = multipartUtil.MultipartFileDto(
	StoreBookDto,
	['book', 'bookCover'],
);

export class BookFilterDto extends BaseFilterDto {
	@IsOptional()
	@IsString()
	genre?: string;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	minPrice?: number;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	maxPrice?: number;

	@IsOptional()
	@Transform(({ value }) => value === 'true')
	@IsBoolean()
	isMature?: boolean;

	@IsOptional()
	@Transform(({ value }) => value === 'true')
	@IsBoolean()
	includeHidden?: boolean;
}
