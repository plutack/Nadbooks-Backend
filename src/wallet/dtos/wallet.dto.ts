import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

import { PaymentMethod } from 'generated/prisma';

export type ExternalPaymentMethod = Exclude<PaymentMethod, 'WALLET'>;

//TODO: this is now redundant
//
export class DepositDto {
	@IsNumber()
	@IsNotEmpty()
	amount: number;

	@IsString()
	@IsNotEmpty()
	paymentMethod: PaymentMethod;
}

export class WithdrawDto {
	@IsNumber()
	@IsNotEmpty()
	amount: number;

	@IsOptional()
	@IsString()
	accountNumber: string;

	@IsOptional()
	@IsString()
	bankCode: string;

	@IsNotEmpty()
	method: ExternalPaymentMethod;

	@IsOptional()
	@IsString()
	walletAddress?: string;
}
