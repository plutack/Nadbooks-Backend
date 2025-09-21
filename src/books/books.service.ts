import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { BaseFilterQueryType } from '@/types/filters.type';
import { JwtPayloadType } from '@/types/jwt.type';
import { StoreBookDto, UpdateBookDto } from './dtos/book.dto';
import { FileType, UpdatableBookFields } from './types';

@Injectable()
export class BooksService {
	constructor(
		private readonly storageService: StorageService,
		private readonly db: PrismaService,
	) {}

	private getBookCoverName(bookName: string): string {
		return `${bookName}-cover`;
	}

	// function to confirm if the file has the right dimensions
	private validateBookCover(file: Express.Multer.File): boolean {
		return true;
	}

	private uploadCover(
		cover: Express.Multer.File,
		title: string,
	): Promise<string> {
		if (!this.validateBookCover(cover)) {
			throw new BadRequestException('Invalid book cover');
		}

		return this.storageService.storeFile(
			FileType.COVER,
			cover,
			this.getBookCoverName(title),
		);
	}

	async storeBook(
		bookDTO: StoreBookDto,
		book: Express.Multer.File,
		bookCover: Express.Multer.File,
		user: JwtPayloadType,
	) {
		const existingBook = await this.getBookByTitle(bookDTO.title);
		if (existingBook) {
			throw new BadRequestException('Book already exists');
		}
		const [bookURL, bookCoverURL] = await Promise.all([
			this.storageService.storeFile(FileType.BOOK, book, bookDTO.title),
			this.uploadCover(bookCover, bookDTO.title),
		]);
		const newBook = await this.db.book.create({
			data: {
				...bookDTO,
				author: user.username, //TODO: maybe we include first and last name in the jwt?
				bookURL,
				bookCoverURL,
				pageCount: Number(bookDTO.pageCount),
				price: Number(bookDTO.price),
				isMature: Boolean(bookDTO.isMature),
				userId: user.sub,
				dateUploaded: new Date(),
				dateAuthored: new Date(bookDTO.dateAuthored),
			},
		});
		return newBook;
	}

	/**
	 * Returns book | null
	 */
	async getBookById(bookId: string) {
		return await this.db.book.findFirst({
			where: { id: bookId },
		});
	}

	async getBooks(filters: BaseFilterQueryType) {
		return await this.db.book.findMany({
			take: filters.limit || 20,
			skip: filters.skip || 0,
		});
	}

	/**
	 * Returns book
	 *
	 * Raises an error if the book is not found
	 */
	async findBookById(bookId: string) {
		const book = await this.getBookById(bookId);
		if (!book) {
			throw new NotFoundException('Book not found');
		}
		return book;
	}

	async getBookByTitle(title: string) {
		return await this.db.book.findFirst({
			where: {
				title: title,
			},
		});
	}

	async findUserBookById(id: string, userId: string) {
		const book = await this.db.book.findFirst({
			where: {
				userId: userId,
				id,
			},
		});
		if (!book) {
			throw new NotFoundException();
		}
		return book;
	}

	async deleteBook(id: string, userId: string) {
		await this.findUserBookById(id, userId);
		await this.db.book.delete({
			where: {
				userId: userId,
				id,
			},
		});
		return true;
	}

	async updateBook(
		id: string,
		userId: string,
		bookDTO: UpdateBookDto,
		book?: Express.Multer.File,
		bookCover?: Express.Multer.File,
	) {
		if (
			(!bookDTO || Object.keys(bookDTO).length === 0) &&
			!book &&
			!bookCover
		) {
			throw new BadRequestException('Please provide fields to be updated');
		}

		const bookRecord = await this.findUserBookById(id, userId);

		const [bookURL, bookCoverURL] = await Promise.all([
			book
				? this.storageService.storeFile(
						FileType.BOOK,
						book,
						bookDTO.title || bookRecord.title,
					)
				: Promise.resolve(undefined),
			bookCover
				? this.uploadCover(bookCover, bookDTO.title || bookRecord.title)
				: Promise.resolve(undefined),
		]);

		const updateData: Partial<UpdatableBookFields> = {};

		for (const key of Object.keys(bookDTO) as (keyof UpdatableBookFields)[]) {
			const value = bookDTO[key];
			if (value !== undefined) {
				updateData[key] =
					key === 'dateAuthored' ? new Date(value as unknown as string) : value;
			}
		}

		if (bookURL) updateData.bookURL = bookURL;
		if (bookCoverURL) updateData.bookCoverURL = bookCoverURL;

		return this.db.book.update({
			where: { id },
			data: updateData,
		});
	}

	async bookmarkBook(userId: string, bookId: string) {
		await this.findBookById(bookId);
		// const hasUserBookmarkedBook = await this.db.bookBookmark.findFirst({
		// 	where:{bookId, userId}
		// })

		// if (hasUserBookmarkedBook) {
		// 	throw new BadRequestException("You have already bookmarked this book.")
		// }
		await this.db.bookBookmark.create({
			data: {
				bookId,
				userId,
			},
		});
	}

	async getUserBookmarkedBooks(userId: string, filters: BaseFilterQueryType) {
		return await this.db.bookBookmark.findMany({
			where: {
				userId,
			},
			select: {
				book: true,
				id: false,
				bookId: false,
				createdAt: true,
			},
			take: filters.limit || 20,
			skip: filters.skip || 0,
		});
	}
}
