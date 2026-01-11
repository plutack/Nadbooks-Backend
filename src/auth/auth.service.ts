import {
	BadRequestException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon from 'argon2';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import {
	CreateUserDto,
	LoginUserDto,
	RefreshTokenDto,
} from '@/auth/dtos/auth.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtPayloadType } from '@/types/jwt.type';
import { RedisService } from '@/redis/redis.service';

@Injectable()
export class AuthService {
	private GOOGLE_CLIENT_ID: string;

	constructor(
		private readonly db: PrismaService,
		private readonly jwt: JwtService,
		private readonly redis: RedisService,
		private readonly config: ConfigService,
	) {
		this.GOOGLE_CLIENT_ID = this.config.getOrThrow<string>('GOOGLE_CLIENT_ID');
	}

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

	async google(token: string) {
		const client = new OAuth2Client(this.GOOGLE_CLIENT_ID);

		let payload;
		try {
			const ticket = await client.verifyIdToken({
				idToken: token,
				audience: this.GOOGLE_CLIENT_ID,
			});
			payload = ticket.getPayload();
		} catch {
			throw new UnauthorizedException('Invalid Google token');
		}

		if (!payload?.email) {
			throw new BadRequestException('Google token missing email');
		}

		const existingUser = await this.db.user.findFirst({
			where: { email: payload.email },
		});

		if (existingUser && !existingUser.passwordHash) {
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

		if (!existingUser) {
			const newUser = await this.db.user.create({
				data: {
					firstName: payload.given_name!,
					lastName: payload.family_name!,
					email: payload.email,
					username: `${payload.email.split('@')[0]}_${crypto.randomBytes(3).toString('hex')}`,
					wallet: { create: { balance: 0 } },
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

			const jwtPayload = {
				sub: newUser.id,
				username: newUser.username,
				email: newUser.email,
				role: newUser.role,
			} satisfies JwtPayloadType;

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

		throw new BadRequestException('Please login via email/password');
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
}
