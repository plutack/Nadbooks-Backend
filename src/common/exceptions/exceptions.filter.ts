import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class ExceptionsFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response: Response = ctx.getResponse();

		let status: number;
		let message: string;
		let errors: string[] | null = null;
		let extra: Record<string, any> = {};

		if (exception instanceof HttpException) {
			status = exception.getStatus();
			const rawResponse = exception.getResponse();

			if (typeof rawResponse === 'string') {
				message = rawResponse;
				errors = [rawResponse];
			} else if (typeof rawResponse === 'object' && rawResponse !== null) {
				const body = rawResponse as Record<string, any>;

				if (Array.isArray(body.message)) {
					errors = body.message;
					message = body.message[0];
				} else if (typeof body.message === 'string') {
					message = body.message;
					errors = [body.message];
					extra = Object.fromEntries(
						Object.entries(body).filter(
							([k]) => k !== 'message' && k !== 'statusCode',
						),
					);
				} else {
					message = exception.message || exception.name;
					errors = [message];
				}
			} else {
				message = exception.message || exception.name;
				errors = [message];
			}
		} else if (
			exception instanceof Error &&
			exception.message === 'Origin not allowed by CORS'
		) {
			status = HttpStatus.FORBIDDEN;
			message = 'ForbiddenResource';
			errors = ['Origin not allowed'];
		} else {
			status = HttpStatus.INTERNAL_SERVER_ERROR;
			message = 'Internal server error';
		}

		response.locals.error = {
			status,
			message,
			errors: errors || undefined,
			stack:
				status >= 500 && exception instanceof Error
					? exception.stack
					: undefined,
		};

		response.status(status).json({
			statusCode: status,
			message,
			errors: errors || undefined,
			...extra,
		});
	}
}
