import {
	ArgumentsHost,
	BadRequestException,
	Catch,
	ExceptionFilter,
	HttpException,
	NotFoundException,
	RequestTimeoutException,
} from '@nestjs/common';
import { error } from 'console';

@Catch(HttpException)
export class ExceptionsFilter<HttpException> implements ExceptionFilter {
	catch(exception: HttpException, host: ArgumentsHost) {
		const http = host.switchToHttp();
		const response = http.getResponse();

		if (exception instanceof BadRequestException) {
			response.status(400).json({
				message: exception.message,
				error: 'Bad request',
			});
		} else if (exception instanceof NotFoundException) {
			response.status(400).json({
				message: exception.message,
				error: 'Not found',
			});
		} else if (exception instanceof RequestTimeoutException) {
			response.status(408).json({
				message: exception.message,
				error: 'Request timeout',
			});
		} else {
			response.status(500).json({
				message: String(exception) || 'An error occured',
				error: 'Internal server error',
			});
		}
	}
}
