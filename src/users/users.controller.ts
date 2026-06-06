import {
	Body,
	Controller,
	Get,
	Patch,
	Post,
	UploadedFile,
	UseGuards,
} from '@nestjs/common';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';
import { AuthService } from '@/auth/auth.service';
import { UploadAvatar } from '@/helpers/decorators/upload-avatar.decorator';
import { JwtPayloadType } from '@/types/jwt.type';
import { ChangePasswordDto } from './dtos/change-password.dto';
import {
	ConfirmEmailChangeDto,
	RequestEmailChangeDto,
} from './dtos/email-change.dto';
import { SetPasswordDto } from './dtos/set-password.dto';
import { UpdateSocialsDto } from './dtos/update-socials.dto';
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

	@Patch('socials')
	updateSocials(
		@CurrentUser() user: JwtPayloadType,
		@Body() updateSocialsDto: UpdateSocialsDto,
	) {
		return this.userService.updateSocials(user.sub, updateSocialsDto);
	}

	@Post('avatar')
	@UploadAvatar()
	uploadAvatar(
		@CurrentUser() user: JwtPayloadType,
		@UploadedFile() file: Express.Multer.File,
	) {
		return this.userService.updateAvatar(user.sub, file);
	}

	@Post('email/request-change')
	requestEmailChange(
		@CurrentUser() user: JwtPayloadType,
		@Body() body: RequestEmailChangeDto,
	) {
		return this.authService.requestEmailChange(user.sub, body.newEmail);
	}

	@Post('email/confirm')
	confirmEmailChange(
		@CurrentUser() user: JwtPayloadType,
		@Body() body: ConfirmEmailChangeDto,
	) {
		return this.authService.confirmEmailChange(user.sub, body.code);
	}

	@Get('bookmarks')
	getBookmarks(@CurrentUser() user: JwtPayloadType) {
		return this.userService.getBookMarkedBooks(user.sub);
	}
}
