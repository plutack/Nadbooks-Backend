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
	constructor(private readonly _logger: Logger) {}
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
