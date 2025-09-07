import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
	private readonly logger = new Logger('HTTP');

	use(req: Request, _res: Response, next: NextFunction) {
		const method = req.method;
		const origin = req.headers.origin || 'unknown origin';
		const url = req.originalUrl;

		this.logger.log(`${method} ${url} - ${origin}`);
		next();
	}
}
