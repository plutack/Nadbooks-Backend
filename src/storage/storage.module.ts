import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_SERVICE } from '@/constants';
import { StorageService } from '@/storage/storage.service';
import { DropboxService } from './providers/dropbox/dropbox.service';

@Module({
	providers: [
		StorageService,
		DropboxService,
		{
			provide: STORAGE_SERVICE,
			useFactory(config: ConfigService) {
				const provider = config.get<string>('STORAGE_PROVIDER');
				switch (provider) {
					case 'dropbox':
						return new DropboxService(config);
					default:
						throw new Error(
							'enviroment variables: STORAGE_PROVIDER not defined properly',
						);
				}
			},
			inject: [ConfigService, DropboxService],
		},
	],
	exports: [StorageService],
})
export class StorageModule {}
