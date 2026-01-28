import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpStatus,
	Logger,
} from '@nestjs/common';
import {
	PrismaClientKnownRequestError,
	PrismaClientUnknownRequestError,
	PrismaClientValidationError,
} from 'generated/prisma/runtime/library';

@Catch(
	PrismaClientKnownRequestError,
	PrismaClientValidationError,
	PrismaClientUnknownRequestError,
)
export class PrismaFilter implements ExceptionFilter {
	constructor(private readonly logger: Logger) {}

	catch(
		exception:
			| PrismaClientKnownRequestError
			| PrismaClientValidationError
			| PrismaClientUnknownRequestError,
		host: ArgumentsHost,
	) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse();

		let status = HttpStatus.BAD_REQUEST;
		let message = 'Database operation failed';
		let errors: string[] = [
			'An unexpected error occurred during database operation',
		];

		if (exception instanceof PrismaClientValidationError) {
			status = HttpStatus.BAD_REQUEST;
			message = 'Validation Error';
			// Extract meaningful info from the verbose error message if needed, or just send a generic one.
			// Prisma validation errors are very verbose and expose internal structure, so we might want to be careful.
			// For dev environment, sending it is fine.
			errors = [exception.message.split('\n').pop() || 'Invalid data provided'];
		} else if (exception instanceof PrismaClientKnownRequestError) {
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
		} else {
			// Unknown request error
			status = HttpStatus.INTERNAL_SERVER_ERROR;
			message = 'Database error';
			errors = ['An unknown error occurred during database operation'];
		}

		const request = ctx.getRequest();

		this.logger.error(
			`[${status}] ${message} - Path: ${request.url}`,
			exception.stack,
		);

		response.status(status).json({
			statusCode: status,
			message,
			errors,
		});
	}
}
