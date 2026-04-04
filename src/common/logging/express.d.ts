import { RequestContext, ErrorContext } from './logger.util';

declare module 'express' {
	interface Request {
		context?: RequestContext;
	}

	interface Response {
		locals: {
			error?: ErrorContext;
		};
	}
}
