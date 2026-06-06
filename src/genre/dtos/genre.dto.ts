import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateGenreDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(255)
	name: string;
}

export class UpdateGenreDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(255)
	name: string;
}
