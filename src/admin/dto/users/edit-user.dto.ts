import { IsOptional, IsString } from 'class-validator';

export class EditUserDto {
	@IsOptional()
	@IsString()
	firstName: string;

	@IsOptional()
	@IsString()
	lastName: string;

	@IsOptional()
	@IsString()
	username: string;
}
