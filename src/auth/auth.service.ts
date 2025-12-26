import {
	BadRequestException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon from 'argon2';
import { OAuth2Client } from 'google-auth-library';
import { CreateUserDto, LoginUserDto } from '@/auth/dtos/auth.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtPayloadType } from '@/types/jwt.type';

@Injectable()
export class AuthService {
	private GOOGLE_CLIENT_ID: string;
	constructor(
		private readonly db: PrismaService,
		private readonly jwt: JwtService,
		config: ConfigService,
	) {
		this.GOOGLE_CLIENT_ID = config.getOrThrow<string>('GOOGLE_CLIENT_ID');
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
				Wallet: {
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
				Wallet: {
					select: {
						balance: true,
					},
				},
			},
		});

		return newUser;
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

		return {
			accessToken,
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
			const jwtPayload = {
				sub: existingUser.id,
				username: existingUser.username,
				email: existingUser.email,
				role: existingUser.role,
			} satisfies JwtPayloadType;
			const accessToken = await this.jwt.signAsync(jwtPayload);
			return {
				accessToken,
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
					username: payload.email.split('@')[0],
					Wallet: { create: { balance: 0 } },
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

			const jwtPayload = {
				sub: newUser.id,
				username: newUser.username,
				email: newUser.email,
				role: newUser.role,
			} satisfies JwtPayloadType;
			const accessToken = await this.jwt.signAsync(jwtPayload);

			return {
				accessToken,
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
}
