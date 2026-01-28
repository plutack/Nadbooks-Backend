import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, ValidateIf } from 'class-validator';
import { PaymentMethod } from 'generated/prisma';

export type ExternalPaymentMethod = Exclude<PaymentMethod, 'WALLET'>;

// Base fields shared by all withdrawals
export class BaseWithdrawDto {
	@Type(() => Number)
	@IsNumber()
	@IsNotEmpty()
	amount: number;
}

// Paystack transfer withdrawal DTO
export class PaystackWithdrawDto extends BaseWithdrawDto {
	@IsString()
	accountNumber: string;

	@IsString()
	accountName: string;

	@IsString()
	bankCode: string;
}

// Crypto withdrawal DTO
export class CryptoWithdrawDto extends BaseWithdrawDto {
	@IsString()
	walletAddress: string;
}

// Unified DTO for requesting a withdrawal
export class WithdrawDto extends BaseWithdrawDto {
	@IsString()
	@IsNotEmpty()
	method: ExternalPaymentMethod;

	// Paystack-specific fields
	@ValidateIf((o: WithdrawDto) => o.method === PaymentMethod.PAYSTACK)
	@IsString()
	@IsNotEmpty()
	accountNumber?: string;

	@ValidateIf((o: WithdrawDto) => o.method === PaymentMethod.PAYSTACK)
	@IsString()
	@IsNotEmpty()
	accountName?: string;

	@ValidateIf((o: WithdrawDto) => o.method === PaymentMethod.PAYSTACK)
	@IsString()
	@IsNotEmpty()
	bankCode?: string;

	// Crypto-specific fields
	@ValidateIf((o: WithdrawDto) => o.method === PaymentMethod.CRYPTO)
	@IsString()
	@IsNotEmpty()
	walletAddress?: string;
}
