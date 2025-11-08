import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';
import { JwtPayloadType } from '@/types/jwt.type';
import { UserService } from './users.service';

@Controller('users')
export class UserController {
	constructor(private userService: UserService) {}

	// // FIX: this should probably be on book
	// @Get('books')
	// @UseGuards(AuthGuard)
	// getBooksByUser(@CurrentUser() user: JwtPayloadType) {
	// 	return this.userService.booksByUser(user);
	// }

	@Get('bookmarks')
	@UseGuards(AuthGuard)
	getBookmarks(@CurrentUser() user: JwtPayloadType) {
		return this.userService.userBookmarks(user);
	}
}
