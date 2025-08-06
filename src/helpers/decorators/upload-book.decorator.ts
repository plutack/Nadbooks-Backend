import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { StoreBookMultipartDto } from '@/books/dtos/book.dto';

export const UploadBook = () =>
	applyDecorators(
		UseInterceptors(FileInterceptor('book')),
		ApiConsumes('multipart/form-data'),
		ApiBody({ type: StoreBookMultipartDto }),
	);
