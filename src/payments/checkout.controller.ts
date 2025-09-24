import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';
import { CheckoutService } from '@/payments/services/checkout.service';
import { JwtPayloadType } from '@/types/jwt.type';
import { CreateCheckoutDto } from './dtos/checkout.dto';

@Controller('checkout')
export class CheckoutController {
	constructor(private readonly checkoutService: CheckoutService) {}
	@Post()
	@UseGuards(AuthGuard)
	async createCheckout(
		@Body() createCheckoutDto: CreateCheckoutDto,
		@CurrentUser() user: JwtPayloadType,
	) {
		return await this.checkoutService.createCheckout();
	}
}
