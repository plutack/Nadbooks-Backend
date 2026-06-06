import { Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { AuthService } from '@/auth/auth.service';
import { AdminAuth, Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Role } from 'generated/prisma';

@Controller('admin')
export class AdminSecurityController {
	constructor(private readonly authService: AuthService) {}

	@Post('users/:id/revoke-sessions')
	@HttpCode(200)
	@AdminAuth()
	revokeUserSessions(@Param('id') id: string) {
		return this.authService.revokeUserSessions(id);
	}

	@Post('security/revoke-all-sessions')
	@HttpCode(200)
	@UseGuards(AuthGuard, RolesGuard)
	@Roles(Role.SUPER_ADMIN)
	revokeAllSessions() {
		return this.authService.revokeAllSessions();
	}
}
