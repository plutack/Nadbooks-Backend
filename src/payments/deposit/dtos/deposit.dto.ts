import { IsNumber, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from 'generated/prisma';

export type ExternalPaymentMethod = Exclude<PaymentMethod, 'WALLET'>;

/** Unified input for initiating a deposit */
export class DepositInput {
	@IsNumber()
	amount: number;

	// Optional for Paystack
	@IsOptional()
	@IsString()
	email?: string;

	// Optional metadata for Paystack
	@IsOptional()
	metadata?: Record<string, any>;

	//  Optional for crypto deposits
	@IsOptional()
	@IsString()
	buyerAddress?: string;

	// Optional hash for crypto payments
	@IsOptional()
	@IsString()
	hash?: string;

	// payment method allowed
	@IsString()
	method: ExternalPaymentMethod;
}

// Unified input for verifying a deposit
export class VerifyDepositInput {
	@IsOptional()
	@IsString()
	reference?: string; // Paystack

	@IsOptional()
	@IsString()
	hash?: string; // Crypto

	@IsOptional()
	@IsString()
	buyerAddress?: string; // Crypto

	@IsOptional()
	@IsNumber()
	transferedAmount?: number; // Crypto
}
