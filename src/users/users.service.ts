import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
    constructor(
        private readonly db: PrismaService
    ) { }

    userBookmarks(user: JwtPayloadType) {
        return this.db.bookBookmark.findMany({
            where: {
                userId: user.sub
            },
            select: {
                book: true,
                bookId: false,
                user: false,
                userId: false
            }
        })
    }

    booksByUser(user: JwtPayloadType) {
        return this.db.book.findMany({
            where: {
                userId: user.sub
            }
        })
    }
}
