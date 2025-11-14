import { IsNumber, IsOptional, IsString } from 'class-validator';

// Input type for initiating a Paystack deposit
export class BankDepositInput {
	@IsNumber()
	amount: number;

	@IsOptional()
	@IsString()
	email?: string;

	@IsOptional()
	metadata?: Record<string, any>;

	@IsString()
	reference: string; // reference is required for Paystack
}

// Input type for verifying a Paystack deposit
export class VerifyPaystackDto {
	@IsString()
	reference: string;
}

// Output type returned from initiating a Paystack deposit
export type BankDepositOutput = {
	paymentUrl: string;
	reference: string;
};
