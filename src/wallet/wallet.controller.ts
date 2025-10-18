import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';
import { CheckoutService } from '@/payments/services/checkout.service';
import { JwtPayloadType } from '@/types/jwt.type';
import { DepositDto } from './dtos/wallet.dto';

@Controller('wallet')
export class WalletController {
	constructor(private readonly checkoutService: CheckoutService) {}
	@Post('deposit')
	@UseGuards(AuthGuard)
	async createDeposit(
		@Body() depositDto: DepositDto,
		@CurrentUser() user: JwtPayloadType,
	) {
		return await this.checkoutService.createDepositCheckout(user, depositDto);
	}
}
