import { IsOptional, IsString, Matches, ValidateIf } from 'class-validator';

export class UpdateSocialsDto {
	@IsOptional()
	@IsString()
	@ValidateIf((_, value) => value !== '')
	@Matches(/^https?:\/\/(www\.)?instagram\.com\/.+/, {
		message: 'instagram must be a valid Instagram URL',
	})
	instagram?: string;

	@IsOptional()
	@IsString()
	@ValidateIf((_, value) => value !== '')
	@Matches(/^https?:\/\/(www\.)?(twitter|x)\.com\/.+/, {
		message: 'twitter must be a valid Twitter/X URL',
	})
	twitter?: string;

	@IsOptional()
	@IsString()
	@ValidateIf((_, value) => value !== '')
	@Matches(/^https?:\/\/(www\.)?(facebook|fb)\.com\/.+/, {
		message: 'facebook must be a valid Facebook URL',
	})
	facebook?: string;
}
