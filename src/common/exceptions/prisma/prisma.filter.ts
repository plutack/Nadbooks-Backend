import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpStatus,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from 'generated/prisma/runtime/library';

@Catch(PrismaClientKnownRequestError)
export class PrismaFilter implements ExceptionFilter {
	catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse();

		let status = HttpStatus.INTERNAL_SERVER_ERROR;
		let message = 'InternalServerErrorException'; // HTTP-level message
		let errors: string[] = ['Internal server error'];

		switch (exception.code) {
			case 'P2002':
				status = HttpStatus.CONFLICT;
				message = 'ConflictException';
				errors = [
					`Duplicate entry detected in model ${exception.meta?.modelName}`,
				];
				break;
			case 'P2025':
				status = HttpStatus.NOT_FOUND;
				message = `The entry in the model ${exception.meta?.modelName} was not found`;
				errors = ['Not found'];
				response?.status(status)?.json({ status, message, errors });
				break;
			default:
				status = HttpStatus.BAD_REQUEST;
				message = 'BadRequestException';
				errors = ['Database request failed'];
		}

		response.status(status).json({
			statusCode: status,
			message,
			errors,
		});
	}
}
