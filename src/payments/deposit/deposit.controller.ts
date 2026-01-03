import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Param,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { PaymentMethod } from 'generated/prisma';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';
import { JwtPayloadType } from '@/types/jwt.type';
import { DepositService } from './deposit.service';
import { DepositDto, VerifyDepositInput } from './dtos/deposit.dto';
import { UppercasePipe } from '@/common/pipes/uppercase.pipe';

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
	@Get('verify/:method')
	async verifyDeposit(
		@Param('method', UppercasePipe) method: ExternalPaymentMethod,
		@Query() query: VerifyDepositInput,
	) {
		return await this.depositService.verifyDeposit(method, query);
	}
}
