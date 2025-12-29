import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpStatus,
	Logger,
} from '@nestjs/common';
import { JsonWebTokenError, TokenExpiredError } from '@nestjs/jwt';

@Catch(TokenExpiredError, JsonWebTokenError)
export class JwtFilter implements ExceptionFilter {
	constructor(private readonly _logger: Logger) {}
	catch(exception: TokenExpiredError | JsonWebTokenError, host: ArgumentsHost) {
		const http = host.switchToHttp();
		const response = http.getResponse();

		const status = HttpStatus.UNAUTHORIZED;
		let message = 'unauthorizedException';
		let errors: string[] = [];

		if (exception instanceof TokenExpiredError) {
			message = 'unauthorizedException';
			errors = ['Token has expired. Please log in again.'];
		} else if (exception instanceof JsonWebTokenError) {
			message = 'unauthorizedException';
			errors = [exception.message || 'Invalid token'];
		}

		response.status(status).json({
			statusCode: status,
			message,
			errors,
		});
	}
}
