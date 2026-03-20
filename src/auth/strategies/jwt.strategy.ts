import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class JWTStrategy extends PassportStrategy(Strategy, 'jwt') {
	constructor(
		config: ConfigService,
		private readonly db: PrismaService,
	) {
		super({
			secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
			jwtFromRequest: ExtractJwt.fromExtractors([
				(req: Request) => req.cookies.accessToken,
				ExtractJwt.fromAuthHeaderAsBearerToken(),
			]),
			ignoreExpiration: false,
		});
	}

	async validate(payload: {
		sub: string;
		email: string;
		username: string;
		role: string;
	}) {
		const user = await this.db.user.findUnique({
			where: { id: payload.sub },
			select: {
				id: true,
				email: true,
				username: true,
				role: true,
				isVerified: true,
			},
		});

		if (!user) {
			return null;
		}

		return user;
	}
}
