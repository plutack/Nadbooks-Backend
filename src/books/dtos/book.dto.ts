import { PartialType } from '@nestjs/mapped-types';
import {
	IsBoolean,
	IsBooleanString,
	IsDateString,
	IsNotEmpty,
	IsNumber,
	IsNumberString,
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
	@IsNumberString()
	price: number;

	@IsNotEmpty()
	@IsBooleanString()
	isMature: boolean;

	// TODO: probably can get this with a processor
	@IsNotEmpty()
	@IsNumberString()
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
