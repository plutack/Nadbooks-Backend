import { Inject, Injectable, Logger } from '@nestjs/common';
import { STORAGE_SERVICE } from '@/constants';
import { IStorageService } from '@/storage/interfaces/storage.interface';

@Injectable()
export class StorageService implements IStorageService {
	private readonly logger = new Logger(StorageService.name);

	constructor(
		@Inject(STORAGE_SERVICE)
		private readonly storageProvider: IStorageService,
	) {}

	async storeFile(file: Express.Multer.File, name: string): Promise<string> {
		try {
			this.logger.log(`Uploading file: ${name}`);
			return await this.storageProvider.storeFile(file, name);
		} catch (error) {
			this.logger.error('Error uploading file:', error);
			throw error;
		}
	}
}
