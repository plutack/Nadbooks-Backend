import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
	IsBoolean,
	IsBooleanString,
	IsDate,
	IsEnum,
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
	@Type(() => Number)
	@IsInt()
	price: number;

	@IsNotEmpty()
	@Transform(({ value }) => {
		if (value === 'true') return true;
		if (value === 'false') return false;
		return value;
	})
	@IsBoolean()
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

export enum BookSort {
	POPULARITY = 'POPULARITY',
	NEWEST = 'NEWEST',
	PRICE_LOW = 'PRICE_LOW',
	PRICE_HIGH = 'PRICE_HIGH',
	ALPHABETICAL = 'ALPHABETICAL',
}

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

	@IsOptional()
	@Transform(({ value }) => value?.toUpperCase())
	@IsEnum(BookSort)
	sortBy?: BookSort;
}
