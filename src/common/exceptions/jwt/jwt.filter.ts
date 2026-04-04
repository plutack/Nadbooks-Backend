import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpStatus,
} from '@nestjs/common';
import {
	JsonWebTokenError as NestJwtError,
	TokenExpiredError as NestTokenError,
} from '@nestjs/jwt';
import { Response } from 'express';
import {
	JsonWebTokenError as LibJwtError,
	TokenExpiredError as LibTokenError,
} from 'jsonwebtoken';

@Catch(NestJwtError, NestTokenError, LibJwtError, LibTokenError)
export class JwtFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response: Response = ctx.getResponse();

		const status = HttpStatus.UNAUTHORIZED;
		let message = 'Authentication failed';
		let errors: string[] = [];

		if (
			exception instanceof NestTokenError ||
			exception instanceof LibTokenError
		) {
			message = 'Authentication failed';
			errors = ['Token has expired. Please log in again.'];
		} else if (
			exception instanceof NestJwtError ||
			exception instanceof LibJwtError
		) {
			message = 'Authentication failed';
			errors = [(exception as Error).message || 'Invalid token'];
		}

		response.locals.error = {
			status,
			message,
			errors,
		};

		response.status(status).json({
			statusCode: status,
			message,
			errors,
		});
	}
}
