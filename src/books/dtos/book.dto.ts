import { MultipartFileDto } from '@/helpers/dto/multipart.util';
import {
	IsBooleanString,
	IsDateString,
	IsNotEmpty,
	IsNumber,
	IsNumberString,
	IsOptional,
	IsString,
	isString,
} from 'class-validator';

export class StoreBookDto {
	@IsNotEmpty()
	@IsString()
	title: string;

	@IsNotEmpty()
	@IsString()
	author: string;

	@IsNotEmpty()
	@IsBooleanString()
	isMature: boolean;

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
