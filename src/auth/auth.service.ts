import {
	BadRequestException,
	HttpException,
	HttpStatus,
	Injectable,
	NotFoundException,
	UnauthorizedException,
	ConflictException,
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
import { RedisService } from '@/redis/redis.service';
import { JwtPayloadType } from '@/types/jwt.type';
import { Role } from 'generated/prisma';
import { EmailService } from '@/email/email.service';

type UserResponse = {
	id: string;
	username: string;
	firstName: string;
	lastName: string;
	email: string;
	role: Role;
	isVerified: boolean;
	googleId: string | null;
};

@Injectable()
export class AuthService {
	constructor(
		private readonly db: PrismaService,
		private readonly jwt: JwtService,
		private readonly redis: RedisService,
		private readonly config: ConfigService,
		private readonly emailService: EmailService,
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
				isVerified: true,
			},
		});

		const isDev = this.config.get<string>('NODE_ENV') !== 'production';
		const code = isDev ? '000000' : crypto.randomInt(100000, 999999).toString();

		await this.redis.setJSON(
			`verify:${dto.email}`,
			{ code, sentAt: Date.now() },
			this.config.getOrThrow<number>('VERIFICATION_CODE_TTL'),
		);

		if (!isDev) {
			await this.emailService.sendEmail({
				to: dto.email,
				subject: 'Your verification code',
				templateName: 'verification',
				variables: { code },
			});
		}

		const jwtPayload: JwtPayloadType = {
			sub: newUser.id,
			username: newUser.username,
			email: newUser.email,
			role: newUser.role,
			isVerified: newUser.isVerified,
		};

		const accessToken = await this.jwt.signAsync(jwtPayload);
		const refreshToken = await this.generateRefreshToken(newUser.id);

		return {
			accessToken,
			refreshToken,
			user: { ...newUser, isVerified: false, hasPassword: true },
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
			throw new UnauthorizedException(
				'This account cannot login with email/password',
			);
		}

		const isMatch = await argon.verify(existingUser.passwordHash, dto.password);

		if (!isMatch) {
			throw new UnauthorizedException('Invalid credentials');
		}

		if (!existingUser.isVerified) {
			await this.queueVerificationEmail(existingUser.email);
		}

		const payload = {
			sub: existingUser.id,
			username: existingUser.username,
			email: existingUser.email,
			role: existingUser.role,
			isVerified: existingUser.isVerified,
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
				isVerified: existingUser.isVerified,
				hasPassword: !!existingUser.passwordHash,
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
			isVerified: user.isVerified,
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
			if (!existingUser.googleId && profile.provider === 'google') {
				await this.db.user.update({
					where: { id: existingUser.id },
					data: { googleId: profile.provider_id },
				});
			}

			if (!existingUser.isVerified) {
				await this.db.user.update({
					where: { id: existingUser.id },
					data: { isVerified: true },
				});
				existingUser.isVerified = true;
			}

			const jwtPayload: JwtPayloadType = {
				sub: existingUser.id,
				username: existingUser.username,
				email: existingUser.email,
				role: existingUser.role,
				isVerified: true,
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
					isVerified: true,
					googleId: existingUser.googleId,
					hasPassword: !!existingUser.passwordHash,
				},
			};
		}

		const newUser = (await this.db.user.create({
			data: {
				firstName: profile.name.givenName || 'User',
				lastName: profile.name.familyName || '',
				email: profile.email,
				username: `${profile.email.split('@')[0]}_${crypto.randomBytes(3).toString('hex')}`,
				googleId: profile.provider_id,
				isVerified: true,
				wallet: { create: { balance: 0 } },
			},
			select: {
				id: true,
				firstName: true,
				lastName: true,
				email: true,
				username: true,
				role: true,
				isVerified: true,
				googleId: true,
			},
		})) as UserResponse;

		const jwtPayload: JwtPayloadType = {
			sub: newUser.id,
			username: newUser.username,
			email: newUser.email,
			role: newUser.role,
			isVerified: newUser.isVerified,
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
				googleId: newUser.googleId,
				hasPassword: false,
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
			isVerified: user.isVerified,
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
			isVerified: user.isVerified,
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

	async linkGoogleAccount(userId: string, token: string) {
		const user = await this.db.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundException('User not found');
		}

		if (user.googleId) {
			throw new ConflictException('Google account is already linked');
		}

		const googleClient = new OAuth2Client(
			this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
		);

		let googleUserId: string;
		let googleEmail: string;

		try {
			const ticket = await googleClient.verifyIdToken({
				idToken: token,
				audience: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
			});
			const payload = ticket.getPayload();
			if (!payload || !payload.email) {
				throw new UnauthorizedException('Invalid Google token payload');
			}
			googleUserId = payload.sub;
			googleEmail = payload.email;
		} catch {
			throw new UnauthorizedException('Invalid Google token');
		}

		if (googleEmail.toLowerCase() !== user.email.toLowerCase()) {
			throw new BadRequestException(
				'Google account email must match your account email',
			);
		}

		const existingGoogleUser = await this.db.user.findFirst({
			where: {
				googleId: googleUserId,
				id: { not: userId },
			},
		});

		if (existingGoogleUser) {
			throw new ConflictException(
				'This Google account is already linked to another user',
			);
		}

		const updatedUser = await this.db.user.update({
			where: { id: userId },
			data: { googleId: googleUserId },
			select: {
				id: true,
				username: true,
				firstName: true,
				lastName: true,
				email: true,
				role: true,
				googleId: true,
			},
		});

		return {
			message: 'Google account linked successfully',
			user: updatedUser,
		};
	}

	async unlinkGoogleAccount(userId: string) {
		const user = await this.db.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundException('User not found');
		}

		if (!user.googleId) {
			throw new BadRequestException('No Google account is currently linked');
		}

		if (!user.passwordHash) {
			throw new BadRequestException(
				'Cannot unlink Google account. Please set a password first using the set-password endpoint.',
			);
		}

		await this.db.user.update({
			where: { id: userId },
			data: { googleId: null },
		});

		return { message: 'Google account unlinked successfully' };
	}

	private async generateAndStoreCode(email: string): Promise<{
		code: string;
		sent: boolean;
	}> {
		const existingData = await this.redis.getJSON<{
			code: string;
			sentAt: number;
		}>(`verify:${email}`);
		const fiveMinutes = 5 * 60 * 1000;
		const ttl = this.config.getOrThrow<number>('VERIFICATION_CODE_TTL');

		if (existingData && Date.now() - existingData.sentAt < fiveMinutes) {
			return { code: existingData.code, sent: false };
		}

		const isDev = this.config.get<string>('NODE_ENV') !== 'production';
		const code =
			existingData?.code ||
			(isDev ? '000000' : crypto.randomInt(100000, 999999).toString());

		await this.redis.setJSON(
			`verify:${email}`,
			{ code, sentAt: Date.now() },
			ttl,
		);

		return { code, sent: true };
	}

	private async queueVerificationEmail(email: string) {
		const { code, sent } = await this.generateAndStoreCode(email);
		const isDev = this.config.get<string>('NODE_ENV') !== 'production';
		if (!isDev) {
			await this.emailService.sendEmail({
				to: email,
				subject: 'Your verification code',
				templateName: 'verification',
				variables: { code },
			});
		}
		return { sent };
	}

	async requestVerification(email: string) {
		const user = await this.db.user.findFirst({
			where: { email },
		});

		if (!user) {
			throw new NotFoundException('User not found');
		}

		if (user.isVerified) {
			throw new HttpException(
				{
					message: 'Email already verified',
				},
				HttpStatus.CONFLICT,
			);
		}

		const { sent } = await this.queueVerificationEmail(email);

		if (!sent) {
			const existingData = await this.redis.getJSON<{
				code: string;
				sentAt: number;
			}>(`verify:${email}`);
			const fiveMinutes = 5 * 60 * 1000;
			const nextRetryIn = Math.ceil(
				(fiveMinutes - (Date.now() - (existingData?.sentAt || 0))) / 1000,
			);
			throw new HttpException(
				{
					message: 'Too many requests',
					nextRetryIn,
				},
				HttpStatus.TOO_MANY_REQUESTS,
			);
		}

		return { message: 'Verification code sent' };
	}

	async verifyEmail(email: string, code: string) {
		const user = await this.db.user.findFirst({
			where: { email },
		});

		if (!user) {
			throw new NotFoundException('User not found');
		}

		if (user.isVerified) {
			throw new HttpException(
				{
					message: 'Email already verified',
				},
				HttpStatus.CONFLICT,
			);
		}

		const storedData = await this.redis.getJSON<{
			code: string;
			sentAt: number;
		}>(`verify:${email}`);

		if (!storedData) {
			throw new BadRequestException('Verification code expired or not found');
		}

		if (storedData.code !== code) {
			throw new UnauthorizedException('Invalid verification code');
		}

		await this.redis.del(`verify:${email}`);

		await this.db.user.update({
			where: { email },
			data: { isVerified: true },
		});

		return { message: 'Email verified successfully' };
	}
}
