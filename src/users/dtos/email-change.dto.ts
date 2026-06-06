import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class RequestEmailChangeDto {
	@IsEmail()
	newEmail: string;
}

export class ConfirmEmailChangeDto {
	@IsString()
	@IsNotEmpty()
	@Length(6, 6)
	code: string;
}
