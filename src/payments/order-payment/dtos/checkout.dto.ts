import {
	IsArray,
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
	IsUUID,
	ValidateIf,
} from 'class-validator';
import { PaymentMethod } from 'generated/prisma';

export type InternalPaymentMethod = Extract<PaymentMethod, 'WALLET'>;

export class CreateCheckoutDto {
	@IsOptional()
	@IsArray()
	@IsUUID('all', { each: true })
	@IsNotEmpty({ each: true })
	@ValidateIf((o) => !o.orderId)
	bookIds?: string[];

	@IsOptional()
	@IsString()
	@IsUUID()
	@ValidateIf((o) => !o.bookIds || o.bookIds.length === 0)
	orderId?: string;

	@IsEnum(PaymentMethod)
	paymentMethod: PaymentMethod;
}
