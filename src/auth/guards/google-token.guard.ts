import {
	Injectable,
	ExecutionContext,
	UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

interface TokenInfo {
	message?: string;
}

@Injectable()
export class GoogleTokenGuard extends AuthGuard('google-token') {
	canActivate(context: ExecutionContext) {
		return super.canActivate(context);
	}

	handleRequest(err: any, user: any, info: any): any {
		if (err || !user) {
			const tokenInfo = info as TokenInfo | undefined;
			const message = tokenInfo?.message || 'Invalid or expired Google token';
			throw err || new UnauthorizedException(message);
		}
		return user;
	}
}
