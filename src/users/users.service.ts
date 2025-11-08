import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtPayloadType } from '@/types/jwt.type';

@Injectable()
export class UserService {
	constructor(private readonly db: PrismaService) {}

	userBookmarks(user: JwtPayloadType) {
		return this.db.bookBookmark.findMany({
			where: {
				userId: user.sub,
			},
			select: {
				book: true,
				bookId: false,
				user: false,
				userId: false,
			},
		});
	}
}
