import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import { PaymentStatus } from '@/payments/deposit/interfaces/provider.interface';

export class CryptoDepositInput {
	@Type(() => Number)
	@IsNumber()
	amount: number;

	@IsString()
	buyerAddress: string;

	@IsString()
	hash: string;
}

export class VerifyPaymentDto {
	@IsString()
	hash: string;

	@IsString()
	buyerAddress: string;

	@Type(() => Number)
	@IsNumber()
	transferedAmount: number;
}
// export type CryptoDepositOutput = {
// 	status: PaymentStatus;
// 	reference: string;
// };
