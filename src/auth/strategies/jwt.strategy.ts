import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JWTStrategy extends PassportStrategy(Strategy, 'jwt') {
	constructor(config: ConfigService) {
		super({
			secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
			jwtFromRequest: ExtractJwt.fromExtractors([
				(req: Request) => req.cookies.accessToken,
				ExtractJwt.fromAuthHeaderAsBearerToken(),
			]),
			ignoreExpiration: config.getOrThrow('IGNORE_JWT_EXPIRATION') === 'true',
		});
	}

	validate(payload) {
		return payload;
	}
}
