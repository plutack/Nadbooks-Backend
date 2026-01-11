import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpStatus,
	Logger,
} from '@nestjs/common';
import {
	JsonWebTokenError as NestJwtError,
	TokenExpiredError as NestTokenError,
} from '@nestjs/jwt';
import {
	JsonWebTokenError as LibJwtError,
	TokenExpiredError as LibTokenError,
} from 'jsonwebtoken';

@Catch(NestJwtError, NestTokenError, LibJwtError, LibTokenError)
export class JwtFilter implements ExceptionFilter {
	constructor(private readonly _logger: Logger) {}
	catch(exception: any, host: ArgumentsHost) {
		const http = host.switchToHttp();
		const response = http.getResponse();

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
			errors = [exception.message || 'Invalid token'];
		}

		response.status(status).json({
			statusCode: status,
			message,
			errors,
		});
	}
}
