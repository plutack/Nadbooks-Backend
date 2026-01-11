import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger,
} from '@nestjs/common';

@Catch()
export class ExceptionsFilter implements ExceptionFilter {
	constructor(private readonly logger: Logger) {}

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse();
		const request = ctx.getRequest();

		let status: number;
		let message: string;
		let errors: string[] | null = null;

		if (exception instanceof HttpException) {
			status = exception.getStatus();
			const rawResponse = exception.getResponse();

			if (typeof rawResponse === 'string') {
				message = rawResponse;
			} else if (typeof rawResponse === 'object' && rawResponse !== null) {
				const body = rawResponse as Record<string, any>;

				// Case 1: Validation errors (message is array)
				if (Array.isArray(body.message)) {
					errors = body.message;
					message = body.message[0]; // Use first error as main message
				}
				// Case 2: Explicit message string in body
				else if (typeof body.message === 'string') {
					message = body.message;
				}
				// Case 3: Error object/string passed in body without explicit keys (fallback)
				else {
					message = exception.message || exception.name;
				}
			} else {
				message = exception.message || exception.name;
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

		// LOGGING STRATEGY
		if (status >= 500) {
			this.logger.error(
				`[${status}] ${message}`,
				(exception as any).stack,
				`ExceptionsFilter`,
			);
		} else {
			this.logger.warn(`[${status}] ${message} - Path: ${request.url}`);
		}

		response.status(status).json({
			statusCode: status,
			message,
			errors: errors || undefined,
		});
	}
}
