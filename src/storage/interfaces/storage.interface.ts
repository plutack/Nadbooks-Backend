import { FileType } from '@/books/types';

export interface IStorageService {
	storeFile(
		filetype: FileType,
		file: Express.Multer.File,
		fileName: string,
	): Promise<string>;
}
