import {
	Body,
	Controller,
	Get,
	HttpCode,
	Post,
	Req,
	UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '@/auth/auth.service';
import {
	CreateUserDto,
	LoginUserDto,
	RefreshTokenDto,
} from '@/auth/dtos/auth.dto';

@Controller('auth')
export class AuthController {
	constructor(private auth: AuthService) {}

	@Post('register')
	registerUser(@Body() body: CreateUserDto) {
		return this.auth.register(body);
	}

	@HttpCode(200)
	@Post('login')
	loginUser(@Body() body: LoginUserDto) {
		return this.auth.login(body);
	}

	@Get('google')
	@UseGuards(AuthGuard('google'))
	googleAuthRedirect() {}

	@Get('google/callback')
	@UseGuards(AuthGuard('google'))
	googleAuthCallback(@Req() req: any) {
		return this.auth.handleOauthLogin(req.user);
	}

	@HttpCode(200)
	@Post('refresh')
	refresh(@Body() body: RefreshTokenDto) {
		return this.auth.refresh(body);
	}

	@HttpCode(200)
	@Post('logout')
	logout(@Body() body: RefreshTokenDto) {
		return this.auth.logout(body);
	}
}
