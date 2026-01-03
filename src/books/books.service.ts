import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { BaseFilterDto } from '@/common/dto/filters.dto';
import { JwtPayloadType } from '@/types/jwt.type';
import {
	BookFilterDto,
	StoreBookDto,
	UpdateBookDto,
} from '@/books/dtos/book.dto';
import { FileType, UpdatableBookFields } from '@/books/types';
import { AdminEditBookDto } from '@/admin/dto/books/edit-book.dto';
import { Role } from 'generated/prisma';
import { ImageProcessor } from '@/common/utils/image.processor';

@Injectable()
export class BooksService {
	constructor(
		private readonly storageService: StorageService,
		private readonly db: PrismaService,
	) {}

	private getBookCoverName(bookName: string): string {
		return `${bookName}-cover`;
	}

	private async processBookCover(
		file: Express.Multer.File,
	): Promise<Buffer | null> {
		return await ImageProcessor.resizeAndOptimize(file.buffer);
	}

	private async uploadCover(
		cover: Express.Multer.File,
		title: string,
	): Promise<string> {
		const processedBuffer = await this.processBookCover(cover);

		if (!processedBuffer) {
			throw new BadRequestException('Invalid book cover image');
		}

		// Update buffer with processed image
		const processedFile = {
			...cover,
			buffer: processedBuffer,
			mimetype: 'image/jpeg', // We converted to jpeg
		};

		return this.storageService.storeFile(
			FileType.COVER,
			processedFile,
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
				bookURL,
				bookCoverURL,
				pageCount: Number(bookDTO.pageCount),
				price: Number(bookDTO.price),
				isMature: Boolean(bookDTO.isMature),
				authorId: user.sub,
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
			where: { id: bookId, isDeleted: false },
		});
	}

	async getBooks(filters: BookFilterDto) {
		const where: any = {};

		if (filters.genre) where.genre = filters.genre;
		if (filters.isMature !== undefined) where.isMature = filters.isMature;

		if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
			where.price = {};
			if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
			if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
		}

		if (!filters.includeHidden) {
			where.isDeleted = false;
		}

		return await this.db.book.findMany({
			take: filters.limit || 20,
			skip: filters.skip || 0,
			where,
		});
	}

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
				title,
			},
		});
	}

	async findAuthorBookById(id: string, authorId: string) {
		const book = await this.db.book.findFirst({
			where: {
				authorId,
				id,
			},
		});
		if (!book) {
			throw new NotFoundException();
		}
		return book;
	}

	//FEAT: user should still be able to delete their own books
	// FIX: what happens when an author delete books that have been bought
	async deleteBook(id: string, authorId: string) {
		await this.findAuthorBookById(id, authorId);
		await this.db.book.update({
			where: {
				id,
			},
			data: {
				isDeleted: true,
				deletedById: authorId,
			},
		});
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

		const bookRecord = await this.findAuthorBookById(id, userId);

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

		await this.db.book.update({
			where: { id },
			data: updateData,
		});
	}

	async bookmarkBook(userId: string, bookId: string) {
		await this.findBookById(bookId);
		return await this.db.bookBookmark.create({
			data: { userId, bookId },
		});
	}

	async removeBookFromBookmark(userId: string, bookId: string) {
		return await this.db.bookBookmark.delete({
			where: {
				userId_bookId: {
					userId,
					bookId,
				},
			},
		});
	}

	async getUserBookmarkedBooks(userId: string, filters: BaseFilterDto) {
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

	async banBook(bookId: string, adminId: string) {
		const book = await this.db.book.update({
			where: { id: bookId },
			data: { isDeleted: true, deletedById: adminId },
		});
		return book;
	}

	async getDeletedBooks(authorId: string) {
		return await this.db.book.findMany({
			where: {
				authorId,
				isDeleted: true,
			},
		});
	}

	async restoreBook(bookId: string, user: JwtPayloadType) {
		const book = await this.db.book.findFirst({
			where: { id: bookId, isDeleted: true },
		});

		if (!book) {
			throw new NotFoundException('Book not found');
		}

		const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
		const isDeleter = book.deletedById === user.sub;

		if (!isAdmin && !isDeleter) {
			throw new ForbiddenException(
				'You are not allowed to restore this book. It may have been deleted by an administrator.',
			);
		}

		return await this.db.book.update({
			where: { id: bookId },
			data: {
				isDeleted: false,
				deletedById: null,
			},
		});
	}

	async adminUpdateBook(bookId: string, payload: AdminEditBookDto) {
		const book = await this.db.book.update({
			where: { id: bookId },
			data: payload,
		});
		return book;
	}
}
