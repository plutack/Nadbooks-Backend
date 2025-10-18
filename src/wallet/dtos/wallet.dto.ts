import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class DepositDto {
	@IsNumber()
	@IsNotEmpty()
	amount: number;

	@IsString()
	@IsNotEmpty()
	paymentMethod: string;
}
