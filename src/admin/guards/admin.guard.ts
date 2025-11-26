import { UsersService } from '@/admin/services/users/users.service';
import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AdminAuthGuard implements CanActivate {
	constructor(
		private readonly jwtService: JwtService,
		private readonly adminService: UsersService,
	) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();
		const token = this.extractTokenFromHeader(request);
		if (!token) {
			throw new UnauthorizedException();
		}
		request['user'] = await this.jwtService.verifyAsync(token);
		const isAdmin = this.adminService.isAdmin(request['user']?.sub);
		if (!isAdmin) {
			throw new UnauthorizedException({
				message: 'You are not authorized for this action',
			});
		}
		return true;
	}

	private extractTokenFromHeader(request: Request): string | undefined {
		const [type, token] = request.headers.authorization?.split(' ') ?? [];
		return type === 'Bearer' ? token : undefined;
	}
}
