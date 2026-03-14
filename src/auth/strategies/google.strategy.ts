import { GoogleResponseUser } from '@/types/google.response';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth2';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
	constructor(config: ConfigService) {
		const GOOGLE_CLIENT_ID = config.getOrThrow<string>('GOOGLE_CLIENT_ID');
		const GOOGLE_CLIENT_SECRET = config.getOrThrow<string>(
			'GOOGLE_CLIENT_SECRET',
		);
		const GOOGLE_CALLBACK_URL = config.getOrThrow<string>(
			'GOOGLE_CALLBACK_URL',
		);
		super({
			clientID: GOOGLE_CLIENT_ID,
			clientSecret: GOOGLE_CLIENT_SECRET,
			callbackURL: GOOGLE_CALLBACK_URL,
			scope: ['profile', 'email'],
		});
	}

	validate(
		_accessToken: string,
		_refreshToken: string,
		profile: GoogleResponseUser,
	) {
		const { name, email, provider, id } = profile;

		return {
			provider,
			provider_id: id,
			email: email,
			name,
		};
	}
}
