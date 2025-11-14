import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtPayloadType } from '@/types/jwt.type';

@Injectable()
export class UserService {
	constructor(private readonly db: PrismaService) {}

	/**
	 * Returns the profile of the currently authenticated user.
	 */
	async getProfile(userId: string) {
		const existingUser = await this.db.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				username: true,
				email: true,
				Wallet: {
					select: {
						balance: true,
					},
				},
			},
		});

		if (!existingUser) {
			throw NotFoundException;
		}

		return existingUser;
	}

	/**
	 * Returns bookmarks of the currently authenticated user.
	 */
	async getBookMarkedBooks(userId: string) {
		const bookmarks = await this.db.bookBookmark.findMany({
			where: { userId },
			select: {
				book: true,
			},
		});

		return bookmarks;
	}
}
