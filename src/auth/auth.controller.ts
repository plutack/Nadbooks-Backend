import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from '@/auth/auth.service';
import { CreateUserDto, LoginUserDto } from '@/auth/dtos/auth.dto';
import { GoogleOauthGuard } from "@/auth/guards/google-oauth.guard"

@Controller('auth')
export class AuthController {
	constructor(private auth: AuthService) { }

	@Post('register')
	registerUser(@Body() body: CreateUserDto) {
		return this.auth.register(body);
	}

	@Post('login')
	loginUser(@Body() body: LoginUserDto) {
		return this.auth.login(body);
	}

	@Get('google')
	@UseGuards(GoogleOauthGuard)
	async googleAuth() { }

	@Get('google/callback')
	@UseGuards(GoogleOauthGuard)
	async googleAuthCallback(@Req() req: IRequestWithUser,) {
		return await this.auth.registerGoogleUser(req.user)
	}
}
