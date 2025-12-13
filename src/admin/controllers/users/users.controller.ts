import { EditUserDto } from '@/admin/dto/users/edit-user.dto';
import { UserActivation } from '@/admin/dto/users/update-user-activation.dto';
import { UserVerification } from '@/admin/dto/users/verify-user.dto';
import { AdminAuthGuard } from '@/admin/guards/admin.guard';
import { UsersService } from '@/admin/services/users/users.service';
import { BaseFilterQueryType } from '@/types/filters.type';
import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Query,
	UseGuards,
} from '@nestjs/common';

@Controller('admin/users')
@UseGuards(AdminAuthGuard)
export class UsersController {
	constructor(private readonly adminUserService: UsersService) {}

	@Get()
	getUsers(@Query() { limit, skip }: BaseFilterQueryType) {
		return this.adminUserService.getUsers(limit, skip);
	}

	@Get(':id')
	getUserById(@Param('id') id: string) {
		return this.adminUserService.findUserById(id);
	}

	@Patch(':id')
	updateUserById(@Param('id') id: string, @Body() body: EditUserDto) {
		return this.adminUserService.updateUser(id, body);
	}

	@Patch('/activate/:id')
	activateUser(@Param('id') id: string) {
		return this.adminUserService.updateUserActiveState(
			id,
			UserActivation.ACTIVATE,
		);
	}

	@Patch('/deactivate/:id')
	deactivateUser(@Param('id') id: string) {
		return this.adminUserService.updateUserActiveState(
			id,
			UserActivation.DEACTIVATE,
		);
	}

	@Patch('/verify/:id')
	verifyById(@Param('id') id: string) {
		return this.adminUserService.updateUserVerification(
			id,
			UserVerification.VERIFY,
		);
	}
}
