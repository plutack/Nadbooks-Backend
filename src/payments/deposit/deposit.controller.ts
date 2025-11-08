import { Body, Controller, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';
import { DepositService } from '@/payments/deposit/deposit.service';
import { DepositDto } from '@/payments/deposit/dtos/deposit.dto';
import { JwtPayloadType } from '@/types/jwt.type';
import { ExternalPaymentMethod } from '../withdrawal/withdrawal.service';

@Controller('deposit')
export class DepositController {
	constructor(private readonly depositService: DepositService) {}

	@Post()
	@UseGuards(AuthGuard)
	async initiateDeposit(
		@Body() depositDto: DepositDto,
		@CurrentUser() user: JwtPayloadType,
	) {
		return await this.depositService.initiateDeposit(user, depositDto);
	}

	@Post('verify')
	async verifyDeposit(@Query('reference') reference: string) {
		return await this.depositService.verifyDeposit(reference);
	}

	@Post('webhook')
	async handleWebhook(@Body() payload: any, @Query() query: any) {
		const headers = query.headers || {};
		// const type = query.type as ExternalPaymentMethod;
		return await this.depositService.handleWebhook(
			payload,
			headers,
			'paystack',
		);
	}
}
