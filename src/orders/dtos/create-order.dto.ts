import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateOrderDto {
	@IsArray()
	@IsUUID('all', { each: true })
	@IsNotEmpty({ each: true })
	bookIds: string[];
}
