import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class VerifyPaymentDto {
	// @IsNotEmpty()
	@IsString()
	hash: string;

	// @IsNotEmpty()
	@IsString()
	buyerAddress: string;

	// @IsNotEmpty()
	@IsNumber()
	@Transform(({ value }) => Number(value))
	transferedAmount: number;
}
