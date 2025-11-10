import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
	IsEmail,
	IsNotEmpty,
	IsString,
	Matches,
	MaxLength,
	MinLength,
	ValidateIf,
} from 'class-validator';

export class CreateUserDto {
	@IsNotEmpty()
	@Transform(({ value }) => value.trim().toLowerCase())
	firstName: string;

	@IsNotEmpty()
	@Transform(({ value }) => value.trim().toLowerCase())
	lastName: string;
	@IsEmail()
	email: string;

	@IsNotEmpty()
	@MinLength(4, { message: 'username must be at least 4 characters long' })
	username: string;

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
	@Matches(/(?=.*[!@#$%^&*])/, {
		message: 'password must contain at least one special character',
	})
	password: string;
}

export class LoginUserDto {
	@IsEmail()
	@Transform(({ value }) => value?.trim().toLowerCase())
	email: string;

	@IsString()
	@IsNotEmpty()
	password: string;
}

export class GoogleAuthDto {
	@IsString()
	token: string;
}
