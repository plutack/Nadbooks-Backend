import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { Book } from 'generated/prisma';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { BaseFilterQueryType } from '@/types/filters.type';
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
			this.storageService.storeFile(
				FileType.COVER, //NOTE: this is probably redundant
				bookCover,
				this.getBookCoverName(bookDTO.title),
			),
		]);
		const newBook = await this.db.book.create({
			data: {
				...bookDTO,
				author: user.username, //TODO: maybe we include first and last name in the jwt?
				bookURL,
				bookCoverURL,
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

	async findUserBookById(id: string, userId: number) {
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

	async deleteBook(id: string, userId: number) {
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
		userId: number,
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
				? this.storageService.storeFile(
						FileType.COVER,
						bookCover,
						this.getBookCoverName(bookDTO.title || bookRecord.title),
					)
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
}
