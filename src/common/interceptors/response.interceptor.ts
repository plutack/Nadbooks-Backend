import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
	intercept(
		context: ExecutionContext,
		next: CallHandler<T>,
	): Observable<unknown> {
		return next.handle().pipe(
			map((data) => {
				const response = context.switchToHttp().getResponse();
				const statusCode = response.statusCode;
				return {
					statusCode,
					message: 'Success',
					errors: null,
					data,
				};
			}),
		);
	}
}
