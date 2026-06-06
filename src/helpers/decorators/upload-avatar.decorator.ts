import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';

const MB = 1024 * 1024;

/**
 * Parses a single `avatar` image into memory. Content-type validation (magic
 * bytes) and resize/upload happen in UserService, after the request is validated.
 */
export const UploadAvatar = () =>
	applyDecorators(
		UseInterceptors(
			FileInterceptor('avatar', {
				storage: memoryStorage(),
				limits: { fileSize: 5 * MB },
			}),
		),
		ApiConsumes('multipart/form-data'),
		ApiBody({
			schema: {
				type: 'object',
				properties: { avatar: { type: 'string', format: 'binary' } },
			},
		}),
	);
