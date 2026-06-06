import { Readable } from 'stream';
import { FileType } from '@/books/types';

export interface IStorageService {
	storeFile(
		filetype: FileType,
		file: Express.Multer.File,
		fileName: string,
	): Promise<string>;

	/**
	 * Upload from a readable stream (e.g. a temp file on disk) without buffering
	 * the whole payload in memory. Returns an object key (private) or public URL.
	 */
	storeStream(
		fileType: FileType,
		stream: Readable,
		fileName: string,
		contentType: string,
	): Promise<string>;

	/** Mint a short-lived URL to download a private object by its key. */
	getSignedUrl(key: string, ttlSeconds?: number): Promise<string>;

	/** Delete an object by its key (private) or public URL (public assets). */
	deleteFile(reference: string): Promise<void>;
}
