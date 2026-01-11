import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpStatus,
	Logger,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from 'generated/prisma/runtime/library';

@Catch(PrismaClientKnownRequestError)
export class PrismaFilter implements ExceptionFilter {
	constructor(private readonly logger: Logger) {}

	catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse();

		let status = HttpStatus.INTERNAL_SERVER_ERROR;
		let message = 'An unexpected error occurred'; // HTTP-level message
		let errors: string[] = ['Internal server error'];

		switch (exception.code) {
			case 'P2002':
				status = HttpStatus.CONFLICT;
				message = `${exception.meta?.modelName || 'Record'} already exists`;
				errors = [
					`Duplicate entry detected in model ${exception.meta?.modelName}`,
				];
				break;
			case 'P2025':
				status = HttpStatus.NOT_FOUND;
				message = `${exception.meta?.modelName || 'Record'} could not be found`;
				errors = [
					`Record not found in model ${exception.meta?.modelName || 'database'}`,
				];
				break;
			default:
				status = HttpStatus.BAD_REQUEST;
				message = 'Database operation failed';
				errors = ['An unexpected error occurred during database operation'];
		}

		this.logger.error(exception);

		response.status(status).json({
			statusCode: status,
			message,
			errors,
		});
	}
}
