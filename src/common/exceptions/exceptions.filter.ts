import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
} from '@nestjs/common';

@Catch(HttpException)
export class ExceptionsFilter implements ExceptionFilter {
	catch(exception: HttpException, host: ArgumentsHost) {
		const http = host.switchToHttp();
		const response = http.getResponse();

		const status = exception.getStatus();
		const raw = exception.getResponse();

		const body =
			typeof raw === 'string'
				? { message: raw }
				: (raw as Record<string, unknown>);

		const errors = Array.isArray(body.message) ? body.message : undefined;

		response.status(status).json({
			statusCode: status,
			message: exception.message,
			errors,
		});
	}
}
