import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AdminEditBookDto {
	@IsOptional()
	@IsString()
	genre: string;

	@IsOptional()
	@IsBoolean()
	isMature: boolean;
}
