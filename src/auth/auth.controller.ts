import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '@/auth/auth.service';
import { CreateUserDto, GoogleAuthDto, LoginUserDto } from '@/auth/dtos/auth.dto';

@Controller('auth')
export class AuthController {
	constructor(private auth: AuthService) {}

	@Post('register')
	registerUser(@Body() body: CreateUserDto) {
		return this.auth.register(body);
	}

	@Post('login')
	loginUser(@Body() body: LoginUserDto) {
		return this.auth.login(body);
	}

	@Post('google')
	googleAuth(@Body() body: GoogleAuthDto) {
		return this.auth.google(body.token)
	}

}
