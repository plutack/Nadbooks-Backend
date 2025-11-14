import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpStatus,
} from '@nestjs/common';
import { JsonWebTokenError, TokenExpiredError } from '@nestjs/jwt';

@Catch(TokenExpiredError, JsonWebTokenError)
export class JwtFilter implements ExceptionFilter {
	catch(exception: TokenExpiredError | JsonWebTokenError, host: ArgumentsHost) {
		const http = host.switchToHttp();
		const response = http.getResponse();

		const status = HttpStatus.UNAUTHORIZED;
		let message = 'Unauthorized Exception';
		let errors: string[] = [];

		if (exception instanceof TokenExpiredError) {
			message = 'Unauthorized Exception';
			errors = ['Token has expired. Please log in again.'];
		} else if (exception instanceof JsonWebTokenError) {
			message = 'Unauthorized Exception';
			errors = [exception.message || 'Invalid token'];
		}

		response.status(status).json({
			statusCode: status,
			message,
			errors,
		});
	}
}
