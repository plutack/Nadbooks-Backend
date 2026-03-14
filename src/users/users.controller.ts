import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';
import { AuthService } from '@/auth/auth.service';
import { JwtPayloadType } from '@/types/jwt.type';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { SetPasswordDto } from './dtos/set-password.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserService } from './users.service';

@Controller('me')
@UseGuards(AuthGuard)
export class UserController {
	constructor(
		private userService: UserService,
		private authService: AuthService,
	) {}

	@Get()
	getProfile(@CurrentUser() user: JwtPayloadType) {
		return this.userService.getProfile(user.sub);
	}

	@Patch()
	updateProfile(
		@CurrentUser() user: JwtPayloadType,
		@Body() updateUserDto: UpdateUserDto,
	) {
		return this.userService.updateProfile(user.sub, updateUserDto);
	}

	@Patch('password')
	changePassword(
		@CurrentUser() user: JwtPayloadType,
		@Body() changePasswordDto: ChangePasswordDto,
	) {
		return this.authService.changePassword(user.sub, changePasswordDto);
	}

	@Post('password')
	setPassword(
		@CurrentUser() user: JwtPayloadType,
		@Body() setPasswordDto: SetPasswordDto,
	) {
		return this.authService.setPassword(user.sub, setPasswordDto);
	}

	@Get('bookmarks')
	getBookmarks(@CurrentUser() user: JwtPayloadType) {
		return this.userService.getBookMarkedBooks(user.sub);
	}
}
