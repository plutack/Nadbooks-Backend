import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { StoreBookMultipartDto } from '@/books/dtos/book.dto';

export const UploadBookAndCover = () =>
	applyDecorators(
		UseInterceptors(
			FileFieldsInterceptor([
				{ name: 'book', maxCount: 1 },
				{ name: 'bookCover', maxCount: 1 },
			]),
		),
		ApiConsumes('multipart/form-data'),
		ApiBody({ type: StoreBookMultipartDto }),
	);
