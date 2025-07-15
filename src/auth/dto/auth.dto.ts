import { Transform } from 'class-transformer';
import {
	IsEmail,
	IsNotEmpty,
	IsOptional,
	IsString,
	Matches,
	MaxLength,
	MinLength,
	ValidateIf,
} from 'class-validator';

export class CreateUserDto {
	@IsNotEmpty()
	firstName: string;
	@IsNotEmpty()
	lastName: string;
	@IsEmail()
	email: string;
	@IsNotEmpty()
	@MinLength(4, { message: 'Username must be at least 4 characters long' })
	username: string;
	@IsNotEmpty()
	@MinLength(8, { message: 'Password must be at least 8 characters long' })
	@MaxLength(20, { message: 'Password must not exceed 20 characters' })
	@Matches(/(?=.*[A-Z])/, {
		message: 'Password must contain at least one uppercase letter',
	})
	@Matches(/(?=.*[a-z])/, {
		message: 'Password must contain at least one lowercase letter',
	})
	@Matches(/(?=.*\d)/, {
		message: 'Password must contain at least one number',
	})
	@Matches(/(?=.*[!@#$%^&*])/, {
		message: 'Password must contain at least one special character',
	})
	password: string;
}

export class LoginUserDto {
	@ValidateIf((o) => !o.email)
	@IsString()
	@Transform(({ value }) => value?.trim().toLowerCase())
	username?: string;

	@ValidateIf((o) => !o.username)
	@IsEmail()
	@Transform(({ value }) => value?.trim().toLowerCase())
	email?: string;

	@IsString()
	@IsNotEmpty()
	password: string;
}
