import {
	IsNotEmpty,
	IsString,
	Matches,
	MaxLength,
	MinLength,
} from 'class-validator';

export class ChangePasswordDto {
	@IsString()
	@IsNotEmpty()
	currentPassword: string;

	@IsString()
	@IsNotEmpty()
	@MinLength(8, { message: 'password must be at least 8 characters long' })
	@MaxLength(20, { message: 'password must not exceed 20 characters' })
	@Matches(/(?=.*[A-Z])/, {
		message: 'password must contain at least one uppercase letter',
	})
	@Matches(/(?=.*[a-z])/, {
		message: 'password must contain at least one lowercase letter',
	})
	@Matches(/(?=.*\d)/, {
		message: 'password must contain at least one number',
	})
	@Matches(/(?=.*[^\w\s])/, {
		message: 'password must contain at least one special character',
	})
	newPassword: string;
}
