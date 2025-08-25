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
		let message = 'Internal server error';
		let error = 'Internal server error';

		switch (exception.code) {
			case 'P2002':
				status = HttpStatus.CONFLICT;
				message = `This entry in the model ${exception.meta?.modelName} already exists.`;
				error = 'Conflict';
				response.status(status).json({ status, message, error });
				break;

			default:
				response.status(400).json({ status, message, error });
		}
	}
}
