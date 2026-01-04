import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';
import {
	CheckoutBodyDto,
	CreateCheckoutDto,
} from '@/payments/order-payment/dtos/checkout.dto';
import { OrderPaymentService } from '@/payments/order-payment/order-payment.service';
import { JwtPayloadType } from '@/types/jwt.type';
import { UppercasePipe } from '@/common/pipes/uppercase.pipe';
import { PaymentMethod } from 'generated/prisma';

@Controller('checkout')
export class CheckoutController {
	constructor(private readonly orderPaymentService: OrderPaymentService) {}
	@Post(':method')
	@UseGuards(AuthGuard)
	async createCheckout(
		@Param('method', UppercasePipe) method: PaymentMethod,
		@Body() checkoutBodyDto: CheckoutBodyDto,
		@CurrentUser() user: JwtPayloadType,
	) {
		const fullDto: CreateCheckoutDto = {
			...checkoutBodyDto,
			paymentMethod: method,
		};
		return await this.orderPaymentService.createOrderCheckout(user, fullDto);
	}
}
