import { Transform } from 'class-transformer';
import {
	IsEmail,
	IsNotEmpty,
	IsString,
	Matches,
	MaxLength,
	MinLength,
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
	@Matches(/(?=.*[^\w\s])/, {
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

export class RefreshTokenDto {
	@IsString()
	@IsNotEmpty()
	refreshToken: string;
}

export class PasswordStrengthDto {
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
	password: string;
}

export class LinkGoogleDto {
	@IsString()
	@IsNotEmpty({ message: 'Google token is required' })
	token: string;
}

export class RequestVerificationDto {
	@IsEmail()
	@Transform(({ value }) => value?.trim().toLowerCase())
	email: string;
}

export class VerifyEmailDto {
	@IsEmail()
	@Transform(({ value }) => value?.trim().toLowerCase())
	email: string;

	@IsString()
	@IsNotEmpty()
	@Matches(/^\d{6}$/, { message: 'Code must be exactly 6 digits' })
	code: string;
}

export class SetPinDto {
	@IsString()
	@IsNotEmpty()
	@Matches(/^\d{6}$/, { message: 'Transaction PIN must be exactly 6 digits' })
	pin: string;
}

export class ChangePinDto {
	@IsString()
	@IsNotEmpty()
	@Matches(/^\d{6}$/, { message: 'Current PIN must be exactly 6 digits' })
	oldPin: string;

	@IsString()
	@IsNotEmpty()
	@Matches(/^\d{6}$/, { message: 'New PIN must be exactly 6 digits' })
	newPin: string;
}

export class RequestPinResetDto {
	@IsEmail()
	@Transform(({ value }) => value?.trim().toLowerCase())
	email: string;
}

export class ConfirmPinResetDto {
	@IsEmail()
	@Transform(({ value }) => value?.trim().toLowerCase())
	email: string;

	@IsString()
	@IsNotEmpty()
	@Matches(/^\d{6}$/, { message: 'Reset code must be exactly 6 digits' })
	code: string;

	@IsString()
	@IsNotEmpty()
	@Matches(/^\d{6}$/, { message: 'New PIN must be exactly 6 digits' })
	newPin: string;
}
