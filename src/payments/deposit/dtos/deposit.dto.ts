import { IsNumber, IsOptional, IsString, ValidateIf } from 'class-validator';
import { PaymentMethod } from 'generated/prisma';

export type ExternalPaymentMethod = Exclude<PaymentMethod, 'WALLET'>;

export class BaseDepositDto {
	@IsNumber()
	amount: number;

	@IsOptional()
	metadata?: Record<string, any>;
}

export class PaystackDepositDto extends BaseDepositDto {
	@IsString()
	email: string;

	@IsString()
	reference: string;
}

export class CryptoDepositDto extends BaseDepositDto {
	@IsOptional()
	@IsString()
	buyerAddress?: string;

	@IsString()
	reference: string;

	@IsOptional()
	@IsString()
	hash?: string;
}

export class DepositDto extends BaseDepositDto {
	@IsString()
	method: ExternalPaymentMethod;

	// Paystack-specific
	@ValidateIf((o) => o.method === PaymentMethod.PAYSTACK)
	@IsString()
	email?: string;

	// Crypto-specific
	@ValidateIf((o) => o.method === PaymentMethod.CRYPTO)
	@IsString()
	buyerAddress?: string;

	@ValidateIf((o) => o.method === PaymentMethod.CRYPTO)
	@IsString()
	hash?: string;
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
