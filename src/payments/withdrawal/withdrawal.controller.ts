import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';
import { JwtPayloadType } from '@/types/jwt.type';
import { ResolveBankAccountDto, WithdrawDto } from './dtos/withdrawal.dto';
import { WithdrawalService } from './withdrawal.service';

@Controller('withdrawal')
export class WithdrawalController {
	constructor(private readonly withdrawalService: WithdrawalService) {}

	@Get('resolve-bank')
	@UseGuards(AuthGuard)
	async resolveBankAccount(@Query() dto: ResolveBankAccountDto) {
		return this.withdrawalService.resolveBankAccount(dto);
	}

	@Get('banks')
	async getBanks() {
		return this.withdrawalService.getBanks();
	}

	@Post()
	@UseGuards(AuthGuard)
	async initiateWithdrawal(
		@Body() dto: WithdrawDto,
		@CurrentUser() user: JwtPayloadType,
	) {
		return this.withdrawalService.initiateWithdrawal(user, dto);
	}
}
