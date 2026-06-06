import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { tmpdir } from 'os';
import { StoreBookMultipartDto } from '@/books/dtos/book.dto';
import { TempFileCleanupInterceptor } from '@/common/interceptors/temp-file-cleanup.interceptor';

const MB = 1024 * 1024;

/**
 * Streams the `book` + `bookCover` fields to temp files on disk (low memory, not
 * R2) so the DTO can be validated first. Content-type checks (magic bytes) and
 * the actual R2 upload happen in BooksService only after validation passes; the
 * TempFileCleanupInterceptor removes the temp files afterwards (success or error),
 * so a failed request never leaves an orphan anywhere.
 */
export const UploadBookAndCover = () =>
	applyDecorators(
		UseInterceptors(
			FileFieldsInterceptor(
				[
					{ name: 'book', maxCount: 1 },
					{ name: 'bookCover', maxCount: 1 },
				],
				{
					storage: diskStorage({ destination: tmpdir() }),
					limits: { fileSize: 50 * MB },
				},
			),
			TempFileCleanupInterceptor,
		),
		ApiConsumes('multipart/form-data'),
		ApiBody({ type: StoreBookMultipartDto }),
	);
