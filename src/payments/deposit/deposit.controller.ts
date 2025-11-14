import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';
import { JwtPayloadType } from '@/types/jwt.type';
import { DepositService } from './deposit.service';
import { DepositInput, VerifyDepositInput } from './dtos/deposit.dto';
import { PaymentMethod } from 'generated/prisma';

export type ExternalPaymentMethod = Exclude<PaymentMethod, 'WALLET'>;

@Controller('deposit')
export class DepositController {
	constructor(private readonly depositService: DepositService) {}

	/** Initiate a deposit */
	@Post()
	@UseGuards(AuthGuard)
	async initiateDeposit(
		@Body() depositDto: DepositInput,
		@CurrentUser() user: JwtPayloadType,
	) {
		if (!depositDto.amount || !depositDto.method) {
			throw new BadRequestException('Amount and method are required');
		}

		return await this.depositService.initiateDeposit(user, depositDto);
	}

	/** Verify a deposit */
	@Get('verify')
	async verifyDeposit(
		@Query('method') method: PaymentMethod,
		@Query() query: VerifyDepositInput,
	) {
		if (!method) throw new BadRequestException('Payment method is required');

		return await this.depositService.verifyDeposit(method, query);
	}

	/** Handle provider webhook */
	@Post('webhook')
	async handleWebhook(
		@Body() payload: any,
		@Query('method') method: PaymentMethod,
		@Query() query: any,
	) {
		const headers = query.headers || {};
		return await this.depositService.handleWebhook(method, payload, headers);
	}
}
