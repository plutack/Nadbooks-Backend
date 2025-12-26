import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminEditBookDto } from '@/admin/dto/books/edit-book.dto';
import { cleanObject } from '@/helpers/dto/clean-dto.util';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AdminBooksService {
	constructor(private readonly db: PrismaService) {}

	async getBooks(limit: number = 10, skip: number = 0) {
		return await this.db.book.findMany({
			take: limit,
			skip,
		});
	}

	private async getBookById(bookId: string) {
		return await this.db.book.findFirst({
			where: { id: bookId },
		});
	}

	async findBookById(bookId: string) {
		const book = await this.getBookById(bookId);
		if (!book) {
			throw new NotFoundException('Book not found');
		}
		return book;
	}

	/**
	 * Sets the visibility of a book to false
	 * A banned book cannot be viewed by users
	 * @param {string} bookId id of the book to be banned
	 */
	async banBook(bookId: string) {
		const book = await this.db.book.update({
			where: { id: bookId },
			data: { isVisible: false },
		});
		return book;
	}

	async update(bookId: string, payload: AdminEditBookDto) {
		const book = await this.db.book.update({
			where: { id: bookId },
			data: cleanObject(payload),
		});
		return book;
	}
}
