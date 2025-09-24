import { IsArray, IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { PaymentMethod } from '@/types/payment.type';

export class CreateCheckoutDto {
	@IsArray()
	@IsUUID('all', { each: true })
	@IsNotEmpty({ each: true })
	bookIds: string[];
	@IsEnum(PaymentMethod)
	paymentMethod: PaymentMethod;
}
