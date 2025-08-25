import { PartialType } from '@nestjs/mapped-types';
import {
	IsBoolean,
	IsDateString,
	IsNotEmpty,
	IsNumber,
	IsString,
} from 'class-validator';
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
	@IsNumber()
	price: number;

	@IsNotEmpty()
	@IsBoolean()
	isMature: boolean;

	@IsNotEmpty()
	@IsNumber()
	pageCount: number;

	@IsNotEmpty()
	@IsDateString()
	dateAuthored: Date;
}

export class UpdateBookDto extends PartialType(StoreBookDto) {}

export const StoreBookMultipartDto = multipartUtil.MultipartFileDto(
	StoreBookDto,
	['book', 'bookCover'],
);
