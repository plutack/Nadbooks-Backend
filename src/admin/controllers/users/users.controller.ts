import { HttpCode } from '@nestjs/common';
import { UserService } from '@/users/users.service';
import { BaseFilterDto } from '@/common/dto/filters.dto';
import { AdminAuth } from '@/auth/decorators/roles.decorator';
import { UpdateUserRoleDto } from '@/admin/dto/users/update-user-role.dto';
import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { JwtPayloadType } from '@/types/jwt.type';
import { CurrentUser } from '@/auth/auth.guard';

@Controller('admin/users')
@AdminAuth()
export class AdminUsersController {
	constructor(private readonly userService: UserService) {}

	@Get()
	getUsers(@Query() { limit, skip }: BaseFilterDto) {
		return this.userService.getUsers(limit, skip);
	}

	@Get(':id')
	getUserById(@Param('id') id: string) {
		return this.userService.findUserById(id);
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
