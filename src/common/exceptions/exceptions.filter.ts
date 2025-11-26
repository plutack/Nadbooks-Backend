import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
} from '@nestjs/common';

@Catch(HttpException)
export class ExceptionsFilter implements ExceptionFilter {
	catch(exception: HttpException, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse();

		let status: number;
		let message: string;
		let errors: string[];

		console.log(exception);
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
		} else {
			status = HttpStatus.INTERNAL_SERVER_ERROR;
			message = 'InternalServerErrorException';
			errors = ['Internal server error'];
		}

		response.status(status).json({
			statusCode: status,
			message,
			errors,
		});
	}
}
