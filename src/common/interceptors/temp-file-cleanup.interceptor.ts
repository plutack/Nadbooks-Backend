import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { unlink } from 'fs/promises';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

/**
 * Deletes any multer temp files for the request once it finishes — on success
 * (after the service has streamed them to storage) and on failure (e.g. a
 * validation error before the controller even runs). Guarantees disk-temp
 * uploads never leak.
 */
@Injectable()
export class TempFileCleanupInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const req = context.switchToHttp().getRequest<Request>();

		return next.handle().pipe(
			finalize(() => {
				for (const file of collectFiles(req)) {
					if (file?.path) {
						void unlink(file.path).catch(() => undefined);
					}
				}
			}),
		);
	}
}

function collectFiles(req: Request): Express.Multer.File[] {
	const files: Express.Multer.File[] = [];
	if (req.file) files.push(req.file);
	if (Array.isArray(req.files)) {
		files.push(...req.files);
	} else if (req.files) {
		for (const field of Object.values(req.files)) {
			files.push(...field);
		}
	}
	return files;
}
