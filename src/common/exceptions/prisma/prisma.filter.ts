import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpStatus,
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
			status = HttpStatus.INTERNAL_SERVER_ERROR;
			message = 'Database error';
			errors = ['An unknown error occurred during database operation'];
		}

		response.locals.error = {
			status,
			message,
			errors,
			stack: status >= 500 ? exception.stack : undefined,
		};

		response.status(status).json({
			statusCode: status,
			message,
			errors,
		});
	}
}
