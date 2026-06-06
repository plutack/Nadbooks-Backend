import { Inject, Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
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

	async storeStream(
		fileType: FileType,
		stream: Readable,
		fileName: string,
		contentType: string,
	): Promise<string> {
		try {
			this.logger.log(`Streaming file: ${fileName}, Type: ${fileType}`);
			return await this.storageProvider.storeStream(
				fileType,
				stream,
				fileName,
				contentType,
			);
		} catch (error) {
			this.logger.error('Error streaming file:', error);
			throw error;
		}
	}

	async getSignedUrl(key: string, ttlSeconds?: number): Promise<string> {
		return this.storageProvider.getSignedUrl(key, ttlSeconds);
	}

	async deleteFile(reference: string): Promise<void> {
		try {
			await this.storageProvider.deleteFile(reference);
		} catch (error) {
			// Deletion failures (e.g. orphan cleanup) shouldn't break the request.
			this.logger.warn(`Failed to delete object ${reference}: ${error}`);
		}
	}
}
