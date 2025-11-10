import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
} from '@nestjs/common';

@Catch(HttpException)
export class ExceptionsFilter implements ExceptionFilter {
	catch(exception: HttpException, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse();

		const status = exception.getStatus();
		const raw = exception.getResponse();

		let errors: string[];
		if (typeof raw === 'string') {
			errors = [raw];
		} else if (typeof raw === 'object' && raw !== null) {
			errors = Array.isArray((raw as any).message)
				? (raw as any).message
				: [(raw as any).message || exception.message];
		} else {
			errors = [exception.message];
		}

		response.status(status).json({
			statusCode: status,
			message: `${exception.name}`,
			errors,
		});
	}
}
