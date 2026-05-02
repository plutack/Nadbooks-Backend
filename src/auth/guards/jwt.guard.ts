import {
	ExecutionContext,
	Injectable,
	ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtValidatedUser } from '@/auth/strategies/jwt.strategy';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
	canActivate(context: ExecutionContext) {
		return super.canActivate(context);
	}

	handleRequest<TUser = JwtValidatedUser>(
		err: any,
		user: TUser,
		info: any,
	): TUser {
		if (err || !user) {
			throw err || new ForbiddenException('Invalid or expired token');
		}

		const validatedUser = user as unknown as JwtValidatedUser;

		if (!validatedUser.isVerified) {
			throw new ForbiddenException('Email verification required');
		}

		if (!validatedUser.isActive) {
			throw new ForbiddenException('Account is deactivated');
		}

		return user;
	}
}
