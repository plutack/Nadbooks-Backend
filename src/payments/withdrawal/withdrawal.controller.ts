import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';
import { JwtPayloadType } from '@/types/jwt.type';
import { WithdrawDto } from './dtos/withdrawal.dto';
import { WithdrawalService } from './withdrawal.service';

@Controller('withdrawal')
export class WithdrawalController {
	constructor(private readonly withdrawalService: WithdrawalService) {}

	@Post()
	@UseGuards(AuthGuard)
	async initiateWithdrawal(
		@Body() dto: WithdrawDto,
		@CurrentUser() user: JwtPayloadType,
	) {
		return await this.withdrawalService.initiateWithdrawal(user, dto);
	}
}
