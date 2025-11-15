import { EditUserDto } from '@/admin/dto/users/edit-user.dto';
import { UserActivation } from '@/admin/dto/users/update-user-activation.dto';
import { UserVerification } from '@/admin/dto/users/verify-user.dto';
import { UsersService } from '@/admin/services/users/users.service';
import { BaseFilterQueryType } from '@/types/filters.type';
import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ApiTags } from '@nestjs/swagger';

@Controller('admin/users')
@ApiTags('Admin Users')
export class UsersController {
	constructor(private readonly adminUserService: UsersService) {}

	@Get()
	@ApiOperation({
		summary: 'Returns the users on the platform',
		description: 'Returns a paginated list of users on the platform',
	})
	getUsers(@Query() { limit, skip }: BaseFilterQueryType) {
		return this.adminUserService.getUsers(limit, skip);
	}

	@Get(':id')
	getUserById(@Param('id') id: number) {
		return this.adminUserService.findUserById(id);
	}

	@Patch(':id')
	updateUserById(@Param('id') id: number, @Body() body: EditUserDto) {
		return this.adminUserService.updateUser(id, body);
	}

	@Patch('/activate/:id')
	activateUser(@Param('id') id: number) {
		return this.adminUserService.updateUserActiveState(
			id,
			UserActivation.ACTIVATE,
		);
	}

	@Patch('/deactivate/:id')
	deactivateUser(@Param('id') id: number) {
		return this.adminUserService.updateUserActiveState(
			id,
			UserActivation.DEACTIVATE,
		);
	}

	@Patch('/verify/:id')
	verifyById(@Param('id') id: number) {
		return this.adminUserService.updateUserVerification(
			id,
			UserVerification.VERIFY,
		);
	}
}
