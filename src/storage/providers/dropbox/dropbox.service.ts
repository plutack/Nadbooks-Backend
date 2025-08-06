import {
	Injectable,
	InternalServerErrorException,
	Logger,
	RequestTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Dropbox } from 'dropbox';
import { IStorageService } from '@/storage/interfaces/storage.interface';

@Injectable()
export class DropboxService implements IStorageService {
	private ACCESS_TOKEN: string;
	private AUTH_CODE: string;
	private APP_KEY: string;
	private APP_SECRET: string;
	private REDIRECT_URI: string;
	private REFRESH_TOKEN: string;
	private readonly DROPBOXTOKENURL = 'https://api.dropbox.com/oauth2/token';
	private readonly logger = new Logger(DropboxService.name);

	constructor(config: ConfigService) {
		this.ACCESS_TOKEN = config.get<string>('DROPBOX_ACCESS_TOKEN')!;
		this.AUTH_CODE = config.get<string>('DROPBOX_AUTH_CODE')!;
		this.APP_KEY = config.get<string>('DROPBOX_APP_KEY')!;
		this.APP_SECRET = config.get<string>('DROPBOX_APP_SECRET')!;
		this.REDIRECT_URI = config.get<string>('DROPBOX_REDIRECT_URI')!;
		this.REFRESH_TOKEN = config.get<string>('DROPBOX_REFRESH_TOKEN')!;
		if (
			!this.ACCESS_TOKEN ||
			!this.AUTH_CODE ||
			!this.APP_KEY ||
			!this.APP_SECRET ||
			!this.REDIRECT_URI ||
			!this.REFRESH_TOKEN
		) {
			throw new Error(
				'Dropbox access token, app key, app secret or auth code not set',
			);
		}
	}

	private async getDropboxClient(): Promise<Dropbox> {
		try {
			const newAccessToken = await this.getNewAccessToken();
			const dbx = new Dropbox({
				accessToken: newAccessToken,
			});
			return dbx;
		} catch (error) {
			this.logger.error('Failed to initialize Dropbox client', error);
			throw new Error('Dropbox client initialization failed');
		}
	}

	async getRefreshToken() {
		const encodedCredentials = btoa(`${this.APP_KEY}:${this.APP_SECRET}`);
		const params = new URLSearchParams();
		params.append('code', this.AUTH_CODE);
		params.append('grant_type', 'authorization_code');
		params.append('redirect_uri', this.REDIRECT_URI);

		const refreshTokenRequest = await fetch(this.DROPBOXTOKENURL, {
			method: 'POST',
			body: params,
			headers: {
				Authorization: `Basic ${encodedCredentials}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		});
		const response = await refreshTokenRequest.json();
		if (refreshTokenRequest.status == 200) {
			return response;
		} else {
			throw new InternalServerErrorException(response);
		}
	}

	async getNewAccessToken() {
		try {
			const encodedCredentials = btoa(`${this.APP_KEY}:${this.APP_SECRET}`);
			const params = new URLSearchParams();
			params.append('grant_type', 'refresh_token');
			params.append('refresh_token', this.REFRESH_TOKEN);
			const tokenRequest = await fetch(this.DROPBOXTOKENURL, {
				method: 'POST',
				body: params,
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Basic ${encodedCredentials}`,
				},
			});

			const response = await tokenRequest.json();
			if (tokenRequest.status !== 200) {
				throw new InternalServerErrorException(response);
			}
			return response['access_token'];
		} catch (error) {
			if (error.message === 'fetch failed') {
				throw new RequestTimeoutException(
					'Please check your internet connection',
				);
			} else {
				throw new InternalServerErrorException(error);
			}
		}
	}
	async storeFile(file: Express.Multer.File, fileName: string) {
		try {
			const dropboxClient = await this.getDropboxClient();
			// pathName should be genre/fileName
			// const sharedLinks = await dropboxClient.sharingListSharedLinks({})
			file.filename = fileName;
			const pathName = `/nadbooks/${file.filename}`;
			await dropboxClient.filesUpload({
				path: pathName,
				contents: file.buffer,
				mode: { '.tag': 'overwrite' },
			});
			const sharedLinkMetadata =
				await dropboxClient.sharingCreateSharedLinkWithSettings({
					path: pathName,
					settings: {
						requested_visibility: { '.tag': 'public' },
					},
				});
			const rawUrl = sharedLinkMetadata.result.url;
			const directUrl = rawUrl
				.replace('www.dropbox.com', 'dl.dropboxusercontent.com')
				.replace('?dl=0', '');
			return directUrl;
		} catch (error) {
			this.logger.error(
				`Failed to upload ${fileName}`,
				error.stack,
				'DropboxService',
			);
			throw error;
		}
	}
}
