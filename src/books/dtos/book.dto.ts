import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
	IsBoolean,
	IsDateString,
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	IsUUID,
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
	@IsUUID()
	genreId: string;

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
	@IsDateString()
	dateAuthored: string;
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
	/** Canonical genre filter — the id from GET /genres. */
	@IsOptional()
	@IsUUID()
	genreId?: string;

	/** Convenience genre filter by name (e.g. ?genre=Fiction). Ignored if genreId is set. */
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
