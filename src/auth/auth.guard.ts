import { JwtPayloadType } from '@/types/jwt.type';
import {
	CanActivate,
	createParamDecorator,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private readonly jwtService: JwtService) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();
		const token = this.extractTokenFromHeader(request);
		if (!token) {
			throw new UnauthorizedException();
		}
		request['user'] = await this.jwtService.verifyAsync(token);
		return true;
	}

	private extractTokenFromHeader(request: Request): string | undefined {
		const [type, token] = request.headers.authorization?.split(' ') ?? [];
		return type === 'Bearer' ? token : undefined;
	}
}

export const CurrentUser = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): JwtPayloadType => {
		const request = ctx.switchToHttp().getRequest();
		const user = request.user;
		if (!user) {
			throw new ForbiddenException('User not found in request.');
		}
		return user;
	},
);
