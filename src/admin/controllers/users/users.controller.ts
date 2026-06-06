import {
	Body,
	Controller,
	Get,
	HttpCode,
	Param,
	Patch,
	Query,
} from '@nestjs/common';
import { Role } from 'generated/prisma';
import { UpdateUserRoleDto } from '@/admin/dto/users/update-user-role.dto';
import { CurrentUser } from '@/auth/auth.guard';
import { AdminAuth } from '@/auth/decorators/roles.decorator';
import { BaseFilterDto } from '@/common/dto/filters.dto';
import { JwtPayloadType } from '@/types/jwt.type';
import { UserService } from '@/users/users.service';

@Controller('admin/users')
@AdminAuth()
export class AdminUsersController {
	constructor(private readonly userService: UserService) {}

	@Get()
	getUsers(
		@Query() { limit, skip }: BaseFilterDto,
		@Query('search') search?: string,
		@Query('role') role?: Role,
	) {
		return this.userService.getUsers(limit, skip, search, role);
	}

	@Get(':id')
	getUserById(@Param('id') id: string) {
		return this.userService.findUserById(id);
	}

	@Get(':id/role-history')
	getRoleHistory(@Param('id') id: string) {
		return this.userService.getRoleHistory(id);
	}

	@Patch('/activate/:id')
	@HttpCode(204)
	activateUser(@Param('id') id: string, @CurrentUser() user: JwtPayloadType) {
		return this.userService.updateUserActiveState(user.role, id, true);
	}

	@Patch('/deactivate/:id')
	@HttpCode(204)
	deactivateUser(@Param('id') id: string, @CurrentUser() user: JwtPayloadType) {
		return this.userService.updateUserActiveState(user.role, id, false);
	}

	@Patch('/verify/:id')
	@HttpCode(204)
	verifyById(@Param('id') id: string) {
		return this.userService.updateUserVerification(id, true);
	}

	@Patch('/role/:id')
	@HttpCode(204)
	@AdminAuth()
	updateRole(
		@Param('id') id: string,
		@Body() body: UpdateUserRoleDto,
		@CurrentUser() user: JwtPayloadType,
	) {
		const requesterId = user.sub;
		return this.userService.updateUserRole(
			requesterId,
			user.role,
			id,
			body.role,
		);
	}
}
