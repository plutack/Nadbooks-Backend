import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from 'generated/prisma';

//TODO: find somewhere to put this. This is littered everywhere
export type ExternalPaymentMethod = Exclude<PaymentMethod, 'WALLET'>;

export class WithdrawDto {
	@IsNumber()
	@IsNotEmpty()
	amount: number;

	@IsOptional()
	@IsString()
	accountNumber?: string;

	@IsOptional()
	@IsString()
	accountName?: string;

	@IsOptional()
	@IsString()
	bankCode: string;

	@IsNotEmpty()
	method: ExternalPaymentMethod;

	@IsOptional()
	@IsString()
	walletAddress?: string;
}
