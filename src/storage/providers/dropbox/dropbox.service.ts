import {
	Injectable,
	InternalServerErrorException,
	Logger,
	RequestTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Dropbox } from 'dropbox';
import { FileType } from '@/books/types';
import { IStorageService } from '@/storage/interfaces/storage.interface';

@Injectable()
export class DropboxService implements IStorageService {
	private AUTH_CODE: string;
	private APP_KEY: string;
	private APP_SECRET: string;
	private REDIRECT_URI: string;
	private REFRESH_TOKEN: string;
	private readonly DROPBOXTOKENURL = 'https://api.dropbox.com/oauth2/token';
	private readonly logger = new Logger(DropboxService.name);

	constructor(config: ConfigService) {
		this.ACCESS_TOKEN = config.getOrThrow<string>('DROPBOX_ACCESS_TOKEN')!;
		this.AUTH_CODE = config.getOrThrow<string>('DROPBOX_AUTH_CODE')!;
		this.APP_KEY = config.getOrThrow<string>('DROPBOX_APP_KEY')!;
		this.APP_SECRET = config.getOrThrow<string>('DROPBOX_APP_SECRET')!;
		this.REDIRECT_URI = config.getOrThrow<string>('DROPBOX_REDIRECT_URI')!;
		this.REFRESH_TOKEN = config.getOrThrow<string>('DROPBOX_REFRESH_TOKEN')!;
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
			throw error;
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
	async storeFile(
		fileType: FileType,
		file: Express.Multer.File,
		fileName: string,
	) {
		const dropboxClient = await this.getDropboxClient();
		const buffer = file.buffer;

		file.filename = fileName;
		const pathName = `/nadbooks/${file.filename}`;

		await dropboxClient.filesUpload({
			path: pathName,
			contents: buffer,
			mode: { '.tag': 'overwrite' },
		});

		const existingLinks = await dropboxClient.sharingListSharedLinks({
			path: pathName,
			direct_only: true,
		});

		let rawUrl: string;

		if (existingLinks.result.links.length > 0) {
			rawUrl = existingLinks.result.links[0].url;
		} else {
			const sharedLinkMetadata =
				await dropboxClient.sharingCreateSharedLinkWithSettings({
					path: pathName,
					settings: {
						requested_visibility: { '.tag': 'public' },
					},
				});
			rawUrl = sharedLinkMetadata.result.url;
		}

		const directUrl = rawUrl
			.replace('www.dropbox.com', 'dl.dropboxusercontent.com')
			.replace('?dl=0', '');
		return directUrl;
	}
}
