import {
	Body,
	Controller,
	HttpCode,
	Post,
	Req,
	UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';

/** Tight limit for brute-force-prone endpoints: 5 requests / minute / IP. */
const STRICT_THROTTLE = { default: { limit: 5, ttl: 60_000 } };
import { AuthService } from '@/auth/auth.service';
import { CurrentUser } from '@/auth/auth.guard';
import { JwtGuard } from '@/auth/guards/jwt.guard';
import { GoogleTokenGuard } from '@/auth/guards/google-token.guard';
import {
	CreateUserDto,
	LoginUserDto,
	RefreshTokenDto,
	LinkGoogleDto,
	RequestVerificationDto,
	VerifyEmailDto,
	SetPinDto,
	ChangePinDto,
	RequestPinResetDto,
	ConfirmPinResetDto,
} from '@/auth/dtos/auth.dto';
import { JwtPayloadType } from '@/types/jwt.type';

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

	@Throttle(STRICT_THROTTLE)
	@Post('register')
	registerUser(@Body() body: CreateUserDto) {
		return this.auth.register(body);
	}

	@Throttle(STRICT_THROTTLE)
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

	@Throttle(STRICT_THROTTLE)
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

	@Throttle(STRICT_THROTTLE)
	@HttpCode(200)
	@Post('request-verification')
	requestVerification(@Body() body: RequestVerificationDto) {
		return this.auth.requestVerification(body.email);
	}

	@Throttle(STRICT_THROTTLE)
	@HttpCode(200)
	@Post('verify-email')
	verifyEmail(@Body() body: VerifyEmailDto) {
		return this.auth.verifyEmail(body.email, body.code);
	}

	@HttpCode(200)
	@Post('pin/set')
	@UseGuards(JwtGuard)
	setPin(@Body() body: SetPinDto, @CurrentUser() user: JwtPayloadType) {
		return this.auth.setPin(user.sub, body.pin);
	}

	@HttpCode(200)
	@Post('pin/change')
	@UseGuards(JwtGuard)
	changePin(@Body() body: ChangePinDto, @CurrentUser() user: JwtPayloadType) {
		return this.auth.changePin(user.sub, body.oldPin, body.newPin);
	}

	@Throttle(STRICT_THROTTLE)
	@HttpCode(200)
	@Post('pin/reset')
	requestPinReset(@Body() body: RequestPinResetDto) {
		return this.auth.requestPinReset(body.email);
	}

	@Throttle(STRICT_THROTTLE)
	@HttpCode(200)
	@Post('pin/reset/confirm')
	confirmPinReset(@Body() body: ConfirmPinResetDto) {
		return this.auth.confirmPinReset(body.email, body.code, body.newPin);
	}
}
