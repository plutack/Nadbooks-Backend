import { EditUserDto } from '@/admin/dto/users/edit-user.dto';
import { UserActivation } from '@/admin/dto/users/update-user-activation.dto';
import { UserVerification } from '@/admin/dto/users/verify-user.dto';
import { UserService } from '@/users/users.service';
import { BaseFilterDto } from '@/common/dto/filters.dto';
import { AdminAuth } from '@/auth/decorators/roles.decorator';
import { UpdateUserRoleDto } from '@/admin/dto/users/update-user-role.dto';
import { Request } from 'express'; // Need to access req.user
import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Query,
	Req,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtPayloadType } from '@/types/jwt.type';

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
	@AdminAuth()
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
