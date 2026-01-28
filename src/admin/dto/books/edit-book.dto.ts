import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { BookStatus } from 'generated/prisma';

export class AdminEditBookDto {
	@IsOptional()
	@IsString()
	genre: string;

	@IsOptional()
	@IsBoolean()
	isMature: boolean;

	@IsOptional()
	@IsEnum(BookStatus)
	status: BookStatus;
}
