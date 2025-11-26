import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';
import { JwtPayloadType } from '@/types/jwt.type';
import { UserService } from './users.service';

@Controller('me')
@UseGuards(AuthGuard)
export class UserController {
	constructor(private userService: UserService) {}

	@Get()
	getProfile(@CurrentUser() user: JwtPayloadType) {
		return this.userService.getProfile(user.sub);
	}

	@Get('bookmarks')
	getBookmarks(@CurrentUser() user: JwtPayloadType) {
		return this.userService.getBookMarkedBooks(user.sub);
	}
}
