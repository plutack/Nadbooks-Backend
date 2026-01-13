import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from '@/auth/auth.service';
import {
	CreateUserDto,
	GoogleAuthDto,
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

	@HttpCode(200)
	@Post('google')
	googleAuth(@Body() body: GoogleAuthDto) {
		return this.auth.google(body.token);
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
