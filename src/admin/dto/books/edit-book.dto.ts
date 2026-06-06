import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { BookStatus } from 'generated/prisma';

export class AdminEditBookDto {
	@IsOptional()
	@IsUUID()
	genreId: string;

	@IsOptional()
	@IsBoolean()
	isMature: boolean;

	@IsOptional()
	@IsEnum(BookStatus)
	status: BookStatus;
}
