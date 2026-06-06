import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_SERVICE } from '@/constants';
import { StorageService } from '@/storage/storage.service';
import { DropboxService } from './providers/dropbox/dropbox.service';
import { R2Service } from './providers/r2/r2.service';

@Module({
	providers: [
		StorageService,
		DropboxService,
		R2Service,
		{
			provide: STORAGE_SERVICE,
			useFactory(
				config: ConfigService,
				r2: R2Service,
				dropbox: DropboxService,
			) {
				const provider = config.getOrThrow<string>('STORAGE_PROVIDER');
				switch (provider) {
					case 'r2':
						return r2;
					case 'dropbox':
						return dropbox;
					default:
						throw new Error(
							'enviroment variables: STORAGE_PROVIDER not defined properly',
						);
				}
			},
			inject: [ConfigService, R2Service, DropboxService],
		},
	],
	exports: [StorageService],
})
export class StorageModule {}
