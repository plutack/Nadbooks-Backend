import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger,
} from '@nestjs/common';
import { JsonWebTokenError } from 'jsonwebtoken';

@Catch()
export class ExceptionsFilter implements ExceptionFilter {
	constructor(private readonly logger: Logger) {}
	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse();

		let status: number;
		let message: string;
		let errors: string[];

		if (exception instanceof HttpException) {
			status = exception.getStatus();
			const raw = exception.getResponse();
			if (typeof raw === 'string') {
				message = raw;
				errors = [raw];
			} else {
				const body = raw as Record<string, any>;
				message = exception.name;
				errors = Array.isArray(body.message) ? body.message : [body.message];
			}
			this.logger.error(exception);
		} else if (
			exception instanceof Error &&
			exception.message === 'Origin not allowed by CORS'
		) {
			status = HttpStatus.FORBIDDEN;
			message = 'ForbiddenResource';
			errors = ['Origin not allowed'];
			this.logger.warn(`[CORS] Blocked request from unauthorized origin`);
		} else {
			status = HttpStatus.INTERNAL_SERVER_ERROR;
			message = 'InternalServerErrorException';
			errors = ['Internal server error'];
			this.logger.error(
				`Unhandled exception: ${exception instanceof Error ? exception.message : exception}`,
				(exception as any).stack,
				(exception as any).constructor?.name,
			);
			this.logger.warn(
				`Debug: Is instanceof JsonWebTokenError? ${exception instanceof JsonWebTokenError}`,
			);
		}

		response.status(status).json({
			statusCode: status,
			message,
			errors,
		});
	}
}
