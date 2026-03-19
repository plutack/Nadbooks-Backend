import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { OAuth2Client } from 'google-auth-library';
import { Strategy } from 'passport-custom';
import { Request } from 'express';

@Injectable()
export class GoogleTokenStrategy extends PassportStrategy(
	Strategy,
	'google-token',
) {
	private readonly client: OAuth2Client;

	constructor(private readonly config: ConfigService) {
		super();
		this.client = new OAuth2Client(
			config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
		);
	}

	async validate(req: Request): Promise<{
		email: string;
		provider: 'google';
		provider_id: string;
		name: { givenName: string; familyName: string };
	}> {
		const token: string | undefined = req.body?.token;

		if (!token) {
			throw new UnauthorizedException('Google ID token is required');
		}

		try {
			const ticket = await this.client.verifyIdToken({
				idToken: token,
				audience: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
			});

			const payload = ticket.getPayload();

			if (!payload || !payload.email) {
				throw new UnauthorizedException('Invalid Google token payload');
			}

			return {
				email: payload.email,
				provider: 'google',
				provider_id: payload.sub,
				name: {
					givenName: payload.given_name ?? '',
					familyName: payload.family_name ?? '',
				},
			};
		} catch (err) {
			if (err instanceof UnauthorizedException) throw err;
			throw new UnauthorizedException('Invalid Google token');
		}
	}
}
