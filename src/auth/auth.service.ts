import {
	ConflictException,
	Injectable,
	InternalServerErrorException,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from 'generated/prisma/runtime/library';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateUserDto, LoginUserDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
	constructor(
		private readonly db: PrismaService,
		private readonly jwt: JwtService,
	) {}

	async register(dto: CreateUserDto) {
		try {
			const passwordHash = await argon.hash(dto.password);

			const newUser = await this.db.user.create({
				data: {
					firstName: dto.firstName.trim().toLowerCase(),
					lastName: dto.lastName.trim().toLowerCase(),
					email: dto.email.trim().toLowerCase(),
					username: dto.username.trim().toLowerCase(),
					passwordHash,
				},
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true,
					username: true,
				},
			});

			return newUser;
		} catch (err) {
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

		const isMatch = await argon.verify(existingUser.passwordHash, dto.password);
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
}
