// src/payments/deposit/dtos/crypto-deposit.dto.ts
import { IsNumber, IsString } from 'class-validator';
import { PaymentStatus } from '@/payments/deposit/interfaces/provider.interface';

export class CryptoDepositInput {
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

	@IsNumber()
	transferedAmount: number;
}
// export type CryptoDepositOutput = {
// 	status: PaymentStatus;
// 	reference: string;
// };
