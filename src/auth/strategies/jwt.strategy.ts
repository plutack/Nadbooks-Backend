import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from 'generated/prisma';
import { PrismaService } from '@/prisma/prisma.service';

export type JwtValidatedUser = Pick<
	User,
	'email' | 'username' | 'role' | 'isVerified' | 'isActive'
> & { sub: string };

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
			ignoreExpiration: config.getOrThrow('IGNORE_JWT_EXPIRATION') === 'true',
		});
	}

	async validate(payload: {
		sub: string;
		email: string;
		username: string;
		role: string;
	}): Promise<JwtValidatedUser | null> {
		const user = await this.db.user.findUnique({
			where: { id: payload.sub },
			select: {
				id: true,
				email: true,
				username: true,
				role: true,
				isVerified: true,
				isActive: true,
			},
		});

		if (!user) {
			return null;
		}

		return {
			...user,
			sub: user.id,
		};
	}
}
