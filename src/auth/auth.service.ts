import {
	BadRequestException,
	ConflictException,
	Injectable,
	InternalServerErrorException,
	UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon from 'argon2';
import { AuthMode } from 'generated/prisma';
import { PrismaClientKnownRequestError } from 'generated/prisma/runtime/library';
import { OAuth2Client } from 'google-auth-library';
import { CreateUserDto, LoginUserDto } from '@/auth/dtos/auth.dto';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AuthService {
	private GOOGLE_CLIENT_ID: string;
	constructor(
		private readonly db: PrismaService,
		private readonly jwt: JwtService,
		config: ConfigService,
	) {
		this.GOOGLE_CLIENT_ID = config.get<string>('GOOGLE_CLIENT_ID')!;
		if (!this.GOOGLE_CLIENT_ID) {
			throw new Error('GOOGLE_CLIENT_ID not set');
		}
	}

	async register(dto: CreateUserDto) {
		try {
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
					Wallet: {
						select: {
							balance: true,
						},
					},
				},
			});

			return newUser;
		} catch (err) {
			console.log(err);
			if (
				err instanceof PrismaClientKnownRequestError &&
				err.code === 'P2002'
			) {
				const target = (err.meta?.target as string[])?.[0] ?? 'Field';
				throw new ConflictException(`${target} already in use`);
			}

			console.error('Unhandled registration error:', err);
			throw new InternalServerErrorException('Registration failed');
		}
	}

	async login(dto: LoginUserDto) {
		const existingUser = await this.db.user.findFirst({
			where: {
				OR: [
					{ username: dto.username ?? undefined },
					{ email: dto.email ?? undefined },
				],
			},
		});

		if (!existingUser) {
			throw new UnauthorizedException('Invalid credentials');
		}

		if (existingUser.authMode !== AuthMode.EMAIL) {
			throw new BadRequestException('Invalid login approach');
		}
		const isMatch = await argon.verify(
			existingUser.passwordHash as string,
			dto.password,
		);

		if (!isMatch) {
			throw new UnauthorizedException('Invalid credentials');
		}

		const payload = {
			sub: existingUser.id,
			username: existingUser.username,
			email: existingUser.email,
		};

		const accessToken = await this.jwt.signAsync(payload);

		return {
			accessToken,
			user: {
				id: existingUser.id,
				username: existingUser.username,
				firstName: existingUser.firstName,
				lastName: existingUser.lastName,
				email: existingUser.email,
			},
		};
	}

	async google(token: string) {
		const client = new OAuth2Client(this.GOOGLE_CLIENT_ID);
		const ticket = await client.verifyIdToken({
			idToken: token,
			audience: this.GOOGLE_CLIENT_ID,
		});
		const payload = ticket.getPayload();
		const existingUser = await this.db.user.findFirst({
			where: {
				email: payload?.email,
			},
		});
		if (existingUser && existingUser.authMode == 'GOOGLE') {
			const jwtPayload = {
				sub: existingUser.id,
				username: existingUser.username,
				email: existingUser.email,
			};

			const accessToken = await this.jwt.signAsync(jwtPayload);
			return {
				accessToken,
				user: {
					id: existingUser.id,
					username: existingUser.username,
					firstName: existingUser.firstName,
					lastName: existingUser.lastName,
					email: existingUser.email,
				},
			};
		} else if (!existingUser) {
			const newUser = await this.db.user.create({
				data: {
					firstName: payload?.given_name!,
					lastName: payload?.family_name!,
					authMode: AuthMode.GOOGLE,
					email: payload?.email!,
					username: payload?.email!.split('@')[0]!,
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
				},
			});
			const jwtPayload = {
				sub: newUser.id,
				username: newUser.username,
				email: newUser.email,
			};

			const accessToken = await this.jwt.signAsync(jwtPayload);
			return {
				accessToken,
				user: {
					id: newUser.id,
					username: newUser.username,
					firstName: newUser.firstName,
					lastName: newUser.lastName,
					email: newUser.email,
				},
			};
		} else {
			throw new BadRequestException('Please login via email');
		}
	}
}
