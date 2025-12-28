import { EditUserDto } from '@/admin/dto/users/edit-user.dto';
import { UserActivation } from '@/admin/dto/users/update-user-activation.dto';
import { UserVerification } from '@/admin/dto/users/verify-user.dto';
import { AuthGuard } from '@/auth/auth.guard';
import { UserService } from '@/users/users.service';
import { BaseFilterQueryType } from '@/types/filters.type';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { Role } from 'generated/prisma';
import { UpdateUserRoleDto } from '@/admin/dto/users/update-user-role.dto';
import { Request } from 'express'; // Need to access req.user
import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Query,
	UseGuards,
	Req,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtPayloadType } from '@/types/jwt.type';

@Controller('admin/users')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class UsersController {
	constructor(private readonly userService: UserService) {}

	@Get()
	getUsers(@Query() { limit, skip }: BaseFilterQueryType) {
		return this.userService.getUsers(limit, skip);
	}

	@Get(':id')
	getUserById(@Param('id') id: string) {
		return this.userService.findUserById(id);
	}

	@Patch(':id')
	updateUserById(@Param('id') id: string, @Body() body: EditUserDto) {
		return this.userService.updateUser(id, body);
	}

	@Patch('/activate/:id')
	activateUser(@Param('id') id: string) {
		return this.userService.updateUserActiveState(
			id,
			true, // UserActivation.ACTIVATE implies true
		);
	}

	@Patch('/deactivate/:id')
	deactivateUser(@Param('id') id: string) {
		return this.userService.updateUserActiveState(
			id,
			false, // UserActivation.DEACTIVATE implies false
		);
	}

	@Patch('/verify/:id')
	verifyById(@Param('id') id: string) {
		return this.userService.updateUserVerification(
			id,
			true, // UserVerification.VERIFY implies true
		);
	}

	@Patch('/role/:id')
	@UseGuards(RolesGuard)
	@Roles(Role.ADMIN, Role.SUPER_ADMIN)
	updateRole(
		@Param('id') id: string,
		@Body() body: UpdateUserRoleDto,
		@Req() req: Request,
	) {
		const user = req['user'] as JwtPayloadType | undefined;
		if (!user) {
			throw new UnauthorizedException();
		}
		const requesterId = user.sub;
		return this.userService.updateUserRole(requesterId, id, body.role);
	}
}
