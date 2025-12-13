import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class AdminEditBookDto {
	@IsOptional()
	@IsString()
	genre: string;

	@IsOptional()
	@IsBoolean()
	isMature: boolean;

	@IsOptional()
	@IsInt()
	pageCount: number;
}
