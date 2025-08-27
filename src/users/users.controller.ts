import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserService } from './users.service';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';

@Controller('users')
export class UserController {
    constructor (private userService: UserService){}

    @Get("bookmarks")
    @UseGuards(AuthGuard)
    getBookmarks(
        @CurrentUser() user: JwtPayloadType
    ){
        return this.userService.userBookmarks(user)
    }
}
