import {
	Body,
	Controller,
	HttpCode,
	Post,
	Req,
	UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '@/auth/auth.service';
import { JwtGuard } from '@/auth/guards/jwt.guard';
import { GoogleTokenGuard } from '@/auth/guards/google-token.guard';
import {
	CreateUserDto,
	LoginUserDto,
	RefreshTokenDto,
	LinkGoogleDto,
} from '@/auth/dtos/auth.dto';

interface GoogleUser {
	email: string;
	name: { givenName?: string; familyName?: string };
	provider: string;
	provider_id: string;
}

interface JwtUser {
	sub: string;
}

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
	@UseGuards(GoogleTokenGuard)
	googleLogin(@Req() req: Request & { user: GoogleUser }) {
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

	@HttpCode(200)
	@Post('google/link')
	@UseGuards(JwtGuard)
	linkGoogle(
		@Req() req: Request & { user: JwtUser },
		@Body() body: LinkGoogleDto,
	) {
		return this.auth.linkGoogleAccount(req.user.sub, body.token);
	}

	@HttpCode(200)
	@Post('google/unlink')
	@UseGuards(JwtGuard)
	unlinkGoogle(@Req() req: Request & { user: JwtUser }) {
		return this.auth.unlinkGoogleAccount(req.user.sub);
	}
}
