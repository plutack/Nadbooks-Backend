import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { PaymentMethod } from 'generated/prisma';

export type ExternalPaymentMethod = Exclude<PaymentMethod, 'WALLET'>;

export class DepositDto {
	@IsNumber()
	@IsNotEmpty()
	amount: number;

	@IsString()
	@IsNotEmpty()
	paymentMethod: ExternalPaymentMethod;
}
