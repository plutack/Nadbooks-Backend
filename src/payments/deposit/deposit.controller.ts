import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { PaymentMethod } from 'generated/prisma';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';
import { JwtPayloadType } from '@/types/jwt.type';
import { DepositService } from './deposit.service';
import { DepositDto, VerifyDepositInput } from './dtos/deposit.dto';

export type ExternalPaymentMethod = Exclude<PaymentMethod, 'WALLET'>;

@Controller('payments')
export class DepositController {
	constructor(private readonly depositService: DepositService) {}

	// Initiate a deposit
	@Post('deposit')
	@UseGuards(AuthGuard)
	async initiateDeposit(
		@Body() depositDto: DepositDto,
		@CurrentUser() user: JwtPayloadType,
	) {
		return await this.depositService.initiateDeposit(user, depositDto);
	}

	// Verify a deposit
	@Get('verify')
	async verifyDeposit(
		@Query('method') method: ExternalPaymentMethod,
		@Query() query: VerifyDepositInput,
	) {
		if (!method) throw new BadRequestException('Payment method is required');

		return await this.depositService.verifyDeposit(method, query);
	}
}
