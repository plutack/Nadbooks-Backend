import { Inject, Injectable, Logger } from '@nestjs/common';
import { FileType } from '@/books/types';
import { STORAGE_SERVICE } from '@/constants';
import { IStorageService } from '@/storage/interfaces/storage.interface';

@Injectable()
export class StorageService implements IStorageService {
	private readonly logger = new Logger(StorageService.name);

	constructor(
		@Inject(STORAGE_SERVICE)
		private readonly storageProvider: IStorageService,
	) {}

	async storeFile(
		fileType: FileType,
		file: Express.Multer.File,
		name: string,
	): Promise<string> {
		try {
			this.logger.log(`Uploading file: ${name}, Type: ${fileType}`);
			return await this.storageProvider.storeFile(fileType, file, name);
		} catch (error) {
			this.logger.error('Error uploading file:', error);
			throw error;
		}
	}
}
