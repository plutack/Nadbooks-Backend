import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { ulid } from 'ulid';
import { logger, maskSensitive } from '@/common/logging/logger.util';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
	use(req: Request, res: Response, next: NextFunction) {
		const requestId = ulid();
		const startTime = Date.now();

		req.context = {
			requestId,
			startTime,
			method: req.method,
			url: req.originalUrl,
			query: maskSensitive(req.query),
			headers: maskSensitive(req.headers),
			body: maskSensitive(req.body),
		};

		logger.log({
			type: 'REQUEST',
			requestId,
			method: req.method,
			url: req.originalUrl,
			query: req.context.query,
			headers: req.context.headers,
			body: req.context.body,
		});

		const chunks: Buffer[] = [];
		const originalJson = res.json.bind(res) as (body: unknown) => Response;

		res.json = (payload: unknown): Response => {
			if (payload !== undefined) {
				chunks.push(Buffer.from(JSON.stringify(payload)));
			}
			return originalJson(payload);
		};

		res.on('finish', () => {
			const duration = Date.now() - startTime;
			const { statusCode } = res;

			let responseBody: unknown;
			try {
				const rawBody = Buffer.concat(chunks).toString('utf-8');
				responseBody = JSON.parse(rawBody);
			} catch {
				responseBody = chunks.length > 0 ? '[non-JSON]' : undefined;
			}

			const error = res.locals.error;

			if (error) {
				logger.error({
					type: 'RESPONSE_ERROR',
					requestId,
					method: req.method,
					url: req.originalUrl,
					status: statusCode,
					duration,
					body: maskSensitive(responseBody),
					error: {
						message: error.message,
						errors: error.errors,
						stack: error.stack,
					},
				});
			} else {
				logger.log({
					type: 'RESPONSE',
					requestId,
					method: req.method,
					url: req.originalUrl,
					status: statusCode,
					duration,
					body: maskSensitive(responseBody),
				});
			}
		});

		next();
	}
}
