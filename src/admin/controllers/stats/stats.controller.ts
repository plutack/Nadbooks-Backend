import { Controller, Get } from '@nestjs/common';
import { AdminAuth } from '@/auth/decorators/roles.decorator';
import { AdminStatsService } from '@/admin/services/admin-stats.service';

@Controller('admin/stats')
@AdminAuth()
export class AdminStatsController {
	constructor(private readonly statsService: AdminStatsService) {}

	@Get()
	getStats() {
		return this.statsService.getStats();
	}
}
