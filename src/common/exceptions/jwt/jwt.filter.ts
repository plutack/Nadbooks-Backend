import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpStatus,
} from '@nestjs/common';
import { TokenExpiredError } from '@nestjs/jwt';

@Catch(TokenExpiredError)
export class JwtFilter implements ExceptionFilter {
	catch(_exception: TokenExpiredError, host: ArgumentsHost) {
		const http = host.switchToHttp();
		const response = http.getResponse();

		const status = HttpStatus.UNAUTHORIZED;
		const message = 'Token has expired. Login to generate a new token.';

		response.status(status).json({
			statusCode: status,
			message,
			errors: ['Token Expired'],
		});
	}
}
