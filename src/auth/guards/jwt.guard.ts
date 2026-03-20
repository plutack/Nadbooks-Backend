import {
	ExecutionContext,
	Injectable,
	ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
	canActivate(context: ExecutionContext) {
		return super.canActivate(context);
	}

	handleRequest(err: any, user: any, info: any) {
		if (err || !user) {
			throw err || new ForbiddenException('Invalid or expired token');
		}

		if (!user.isVerified) {
			throw new ForbiddenException('Email verification required');
		}

		return user;
	}
}
