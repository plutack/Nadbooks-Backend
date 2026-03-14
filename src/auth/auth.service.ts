import {
	BadRequestException,
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon from 'argon2';
import * as crypto from 'crypto';
import {
	CreateUserDto,
	LoginUserDto,
	RefreshTokenDto,
} from '@/auth/dtos/auth.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { JwtPayloadType } from '@/types/jwt.type';

@Injectable()
export class AuthService {
	constructor(
		private readonly db: PrismaService,
		private readonly jwt: JwtService,
		private readonly redis: RedisService,
		private readonly config: ConfigService,
	) {}

	private async generateRefreshToken(userId: string): Promise<string> {
		const refreshToken = crypto.randomUUID();
		// Store token -> userId so we can look it up by token later
		// Key: refresh:{token} -> Value: userId
		await this.redis.set(
			`refresh:${refreshToken}`,
			userId,
			this.config.getOrThrow<number>('REFRESH_TOKEN_TTL'),
		);
		return refreshToken;
	}

	async register(dto: CreateUserDto) {
		const passwordHash = await argon.hash(dto.password);

		const newUser = await this.db.user.create({
			data: {
				firstName: dto.firstName,
				lastName: dto.lastName,
				email: dto.email,
				username: dto.username,
				passwordHash,
				wallet: {
					create: {
						balance: 0,
					},
				},
			},
			select: {
				id: true,
				firstName: true,
				lastName: true,
				email: true,
				username: true,
				role: true,
				wallet: {
					select: {
						balance: true,
					},
				},
			},
		});

		const jwtPayload: JwtPayloadType = {
			sub: newUser.id,
			username: newUser.username,
			email: newUser.email,
			role: newUser.role,
		};

		const accessToken = await this.jwt.signAsync(jwtPayload);
		const refreshToken = await this.generateRefreshToken(newUser.id);

		return {
			accessToken,
			refreshToken,
			user: newUser,
		};
	}

	async login(dto: LoginUserDto) {
		const existingUser = await this.db.user.findFirst({
			where: { email: dto.email },
		});

		if (!existingUser) {
			throw new UnauthorizedException('Invalid credentials');
		}

		if (!existingUser.passwordHash) {
			throw new BadRequestException(
				'This account cannot login with email/password',
			);
		}

		const isMatch = await argon.verify(existingUser.passwordHash, dto.password);

		if (!isMatch) {
			throw new UnauthorizedException('Invalid credentials');
		}

		const payload = {
			sub: existingUser.id,
			username: existingUser.username,
			email: existingUser.email,
			role: existingUser.role,
		} satisfies JwtPayloadType;

		const accessToken = await this.jwt.signAsync(payload);
		const refreshToken = await this.generateRefreshToken(existingUser.id);

		return {
			accessToken,
			refreshToken,
			user: {
				id: existingUser.id,
				username: existingUser.username,
				firstName: existingUser.firstName,
				lastName: existingUser.lastName,
				email: existingUser.email,
				role: existingUser.role,
			},
		};
	}

	async refresh(dto: RefreshTokenDto) {
		const { refreshToken } = dto;
		const userId = await this.redis.get(`refresh:${refreshToken}`);

		if (!userId) {
			throw new UnauthorizedException('Invalid or expired refresh token');
		}

		// Rotate token: delete old one
		await this.redis.del(`refresh:${refreshToken}`);

		// Get user details for new AT
		const user = await this.db.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		const payload: JwtPayloadType = {
			sub: user.id,
			username: user.username,
			email: user.email,
			role: user.role,
		};

		const accessToken = await this.jwt.signAsync(payload);
		const newRefreshToken = await this.generateRefreshToken(user.id);

		return {
			accessToken,
			refreshToken: newRefreshToken,
		};
	}

	async logout(dto: RefreshTokenDto) {
		await this.redis.del(`refresh:${dto.refreshToken}`);
		return { message: 'Logged out successfully' };
	}

	async handleOauthLogin(profile: {
		email: string;
		name: { givenName?: string; familyName?: string };
		provider: string;
		provider_id: string;
	}) {
		if (!profile.email) {
			throw new BadRequestException('OAuth profile missing email');
		}

		const existingUser = await this.db.user.findFirst({
			where: { email: profile.email },
		});

		if (existingUser) {
			const jwtPayload: JwtPayloadType = {
				sub: existingUser.id,
				username: existingUser.username,
				email: existingUser.email,
				role: existingUser.role,
			};
			const accessToken = await this.jwt.signAsync(jwtPayload);
			const refreshToken = await this.generateRefreshToken(existingUser.id);
			return {
				accessToken,
				refreshToken,
				user: {
					id: existingUser.id,
					username: existingUser.username,
					firstName: existingUser.firstName,
					lastName: existingUser.lastName,
					email: existingUser.email,
					role: existingUser.role,
				},
			};
		}

		const newUser = await this.db.user.create({
			data: {
				firstName: profile.name.givenName || 'User',
				lastName: profile.name.familyName || '',
				email: profile.email,
				username: `${profile.email.split('@')[0]}_${crypto.randomBytes(3).toString('hex')}`,
				wallet: { create: { balance: 0 } },
			},
			select: {
				id: true,
				firstName: true,
				lastName: true,
				email: true,
				username: true,
				role: true,
			},
		});

		const jwtPayload: JwtPayloadType = {
			sub: newUser.id,
			username: newUser.username,
			email: newUser.email,
			role: newUser.role,
		};

		const accessToken = await this.jwt.signAsync(jwtPayload);
		const refreshToken = await this.generateRefreshToken(newUser.id);

		return {
			accessToken,
			refreshToken,
			user: {
				id: newUser.id,
				username: newUser.username,
				firstName: newUser.firstName,
				lastName: newUser.lastName,
				email: newUser.email,
				role: newUser.role,
			},
		};
	}

	async changePassword(
		userId: string,
		payload: { currentPassword: string; newPassword: string },
	) {
		const user = await this.db.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundException('User not found');
		}

		if (!user.passwordHash) {
			throw new BadRequestException(
				'This account cannot change password (logged in via social)',
			);
		}

		const isMatch = await argon.verify(
			user.passwordHash,
			payload.currentPassword,
		);
		if (!isMatch) {
			throw new UnauthorizedException('Current password is incorrect');
		}

		const newPasswordHash = await argon.hash(payload.newPassword);
		await this.db.user.update({
			where: { id: userId },
			data: { passwordHash: newPasswordHash },
		});

		const jwtPayload: JwtPayloadType = {
			sub: user.id,
			username: user.username,
			email: user.email,
			role: user.role,
		};
		const accessToken = await this.jwt.signAsync(jwtPayload);
		const refreshToken = await this.generateRefreshToken(user.id);

		return {
			accessToken,
			refreshToken,
			user: {
				id: user.id,
				username: user.username,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				role: user.role,
			},
		};
	}

	async setPassword(userId: string, payload: { password: string }) {
		const user = await this.db.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundException('User not found');
		}

		if (user.passwordHash) {
			throw new BadRequestException(
				'This account already has a password. Use change password instead.',
			);
		}

		const passwordHash = await argon.hash(payload.password);
		await this.db.user.update({
			where: { id: userId },
			data: { passwordHash },
		});

		const jwtPayload: JwtPayloadType = {
			sub: user.id,
			username: user.username,
			email: user.email,
			role: user.role,
		};
		const accessToken = await this.jwt.signAsync(jwtPayload);
		const refreshToken = await this.generateRefreshToken(user.id);

		return {
			accessToken,
			refreshToken,
			user: {
				id: user.id,
				username: user.username,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				role: user.role,
			},
		};
	}
}
