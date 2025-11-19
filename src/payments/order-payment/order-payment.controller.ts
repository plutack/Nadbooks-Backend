import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';
import { CreateCheckoutDto } from '@/payments/order-payment/dtos/checkout.dto';
import { OrderPaymentService } from '@/payments/order-payment/order-payment.service';
import { JwtPayloadType } from '@/types/jwt.type';

@Controller('checkout')
export class CheckoutController {
	constructor(private readonly orderPaymentService: OrderPaymentService) {}
	@Post()
	@UseGuards(AuthGuard)
	async createCheckout(
		@Body() createCheckoutDto: CreateCheckoutDto,
		@CurrentUser() user: JwtPayloadType,
	) {
		return await this.orderPaymentService.createOrderCheckout(
			user,
			createCheckoutDto,
		);
	}
}
