import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from 'generated/prisma';
import { isDev } from '@/helpers/functions';
import { PrismaService } from '@/prisma/prisma.service';

export type JwtValidatedUser = Pick<
	User,
	'email' | 'username' | 'role' | 'isVerified' | 'isActive'
> & { sub: string };

@Injectable()
export class JWTStrategy extends PassportStrategy(Strategy, 'jwt') {
	private readonly logger = new Logger(JWTStrategy.name);

	constructor(
		config: ConfigService,
		private readonly db: PrismaService,
	) {
		const dev = isDev(config);
		const ignoreFlag = config.getOrThrow('IGNORE_JWT_EXPIRATION') === 'true';

		super({
			secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
			jwtFromRequest: ExtractJwt.fromExtractors([
				(req: Request) => req.cookies.accessToken,
				ExtractJwt.fromAuthHeaderAsBearerToken(),
			]),
			// Never honour IGNORE_JWT_EXPIRATION outside development — leaving it on
			// in production would let expired access tokens through indefinitely.
			ignoreExpiration: dev && ignoreFlag,
		});

		if (!dev && ignoreFlag) {
			this.logger.warn(
				'IGNORE_JWT_EXPIRATION=true is ignored in production; token expiry is enforced. Set it to false to silence this warning.',
			);
		}
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
