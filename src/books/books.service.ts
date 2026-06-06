import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookStatus, OrderStatus, Role } from 'generated/prisma';
import { AdminEditBookDto } from '@/admin/dto/books/edit-book.dto';
import {
	BookFilterDto,
	StoreBookDto,
	UpdateBookDto,
} from '@/books/dtos/book.dto';
import { createReadStream } from 'fs';
import { readFile } from 'fs/promises';
import { FileType, UpdatableBookFields } from '@/books/types';
import { BaseFilterDto } from '@/common/dto/filters.dto';
import { ImageProcessingService } from '@/common/image/image-processing.service';
import {
	ALLOWED_BOOK_LABELS,
	ALLOWED_IMAGE_LABELS,
	assertAllowedTypeFromPath,
	mimeForLabel,
} from '@/common/mime';
import { GenreService } from '@/genre/genre.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { StorageService } from '@/storage/storage.service';
import { JwtPayloadType } from '@/types/jwt.type';

@Injectable()
export class BooksService {
	private readonly logger = new Logger(BooksService.name);
	private readonly cacheTTL: number;

	constructor(
		private readonly storageService: StorageService,
		private readonly db: PrismaService,
		private readonly imageProcessor: ImageProcessingService,
		private readonly redis: RedisService,
		private readonly configService: ConfigService,
		private readonly genreService: GenreService,
	) {
		this.cacheTTL = this.configService.getOrThrow<number>('CACHE_TTL');
	}

	private getBookCoverName(bookName: string): string {
		return `${bookName}-cover`;
	}

	/**
	 * Strips the private storage key (`bookURL`) before returning a book to a
	 * client — the file is only reachable via the access-controlled
	 * `GET /books/:id/download` endpoint.
	 */
	private serializeBook<T extends { bookURL?: string }>(
		book: T,
	): Omit<T, 'bookURL'> {
		const copy = { ...book };
		delete (copy as { bookURL?: string }).bookURL;
		return copy;
	}

	private serializeBooks<T extends { bookURL?: string }>(
		books: T[],
	): Omit<T, 'bookURL'>[] {
		return books.map((book) => this.serializeBook(book));
	}

	/** Validates the cover is a real image, optimizes it, and uploads it. */
	private async uploadCover(
		cover: Express.Multer.File,
		title: string,
	): Promise<string> {
		await assertAllowedTypeFromPath(cover.path, ALLOWED_IMAGE_LABELS);

		const processedBuffer = await this.imageProcessor.resizeAndOptimize(
			await readFile(cover.path),
		);
		if (!processedBuffer) {
			throw new BadRequestException('Invalid book cover image');
		}

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

	/** Streams a temp book file to storage and returns its object key. */
	private async uploadBookFile(
		book: Express.Multer.File,
		title: string,
	): Promise<string> {
		const label = await assertAllowedTypeFromPath(book.path, ALLOWED_BOOK_LABELS);
		return this.storageService.storeStream(
			FileType.BOOK,
			createReadStream(book.path),
			title,
			mimeForLabel(label) ?? 'application/octet-stream',
		);
	}

	async storeBook(
		bookDTO: StoreBookDto,
		book: Express.Multer.File,
		bookCover: Express.Multer.File,
		user: JwtPayloadType,
	) {
		// Validate everything BEFORE uploading anything, so a bad request never
		// leaves an orphan in storage and the user can just fix their input.
		await this.genreService.assertExists(bookDTO.genreId);
		const existingBook = await this.getBookByTitle(bookDTO.title);
		if (existingBook) {
			throw new BadRequestException('Book already exists');
		}
		await assertAllowedTypeFromPath(book.path, ALLOWED_BOOK_LABELS);
		await assertAllowedTypeFromPath(bookCover.path, ALLOWED_IMAGE_LABELS);

		// All validated — now upload. If a later step fails, roll back what we stored.
		const bookURL = await this.uploadBookFile(book, bookDTO.title);
		let bookCoverURL: string;
		try {
			bookCoverURL = await this.uploadCover(bookCover, bookDTO.title);
			const newBook = await this.db.book.create({
				data: {
					...bookDTO,
					bookURL,
					bookCoverURL,
					pageCount: 0,
					price: Number(bookDTO.price),
					isMature: Boolean(bookDTO.isMature),
					authorId: user.sub,
					dateUploaded: new Date(),
					dateAuthored: new Date(bookDTO.dateAuthored),
				},
			});
			return this.serializeBook(newBook);
		} catch (err) {
			await this.storageService.deleteFile(bookURL);
			if (bookCoverURL!) await this.storageService.deleteFile(bookCoverURL);
			throw err;
		}
	}

	/**
	 * Returns book | null
	 */
	async getBookById(bookId: string, includeHidden = false) {
		const where: any = { id: bookId };
		if (!includeHidden) {
			where.isDeleted = false;
		}
		return await this.db.book.findFirst({
			where,
			include: { genre: { select: { id: true, name: true } } },
		});
	}

	async getBooks(filters: BookFilterDto) {
		const cacheKey = `books:list:${JSON.stringify(filters)}`;
		const cachedBooks = await this.redis.getJSON(cacheKey);

		if (cachedBooks) {
			return cachedBooks;
		}

		const where: any = {};

		// genreId is canonical; fall back to filtering by genre name through the relation.
		if (filters.genreId) {
			where.genreId = filters.genreId;
		} else if (filters.genre) {
			where.genre = { name: filters.genre };
		}
		if (filters.isMature !== undefined) where.isMature = filters.isMature;

		if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
			where.price = {};
			if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
			if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
		}

		if (!filters.includeHidden) {
			where.isDeleted = false;
			where.status = BookStatus.APPROVED;
		}

		const orderBy: any = {};

		switch (filters.sortBy) {
			case 'POPULARITY':
				orderBy.OrderBook = { _count: 'desc' };
				break;
			case 'NEWEST':
				orderBy.dateUploaded = 'desc';
				break;
			case 'PRICE_LOW':
				orderBy.price = 'asc';
				break;
			case 'PRICE_HIGH':
				orderBy.price = 'desc';
				break;
			case 'ALPHABETICAL':
				orderBy.title = 'asc';
				break;
		}

		const books = await this.db.book.findMany({
			take: filters.limit || 20,
			skip: filters.skip || 0,
			where,
			include: { genre: { select: { id: true, name: true } } },
			orderBy: Object.keys(orderBy).length > 0 ? orderBy : undefined,
		});

		const serialized = this.serializeBooks(books);
		await this.redis.setJSON(cacheKey, serialized, this.cacheTTL);
		return serialized;
	}

	async getUserBooks(userId: string, filters: BaseFilterDto) {
		const books = await this.db.book.findMany({
			where: {
				authorId: userId,
				isDeleted: false,
			},
			include: { genre: { select: { id: true, name: true } } },
			take: filters.limit || 20,
			skip: filters.skip || 0,
			orderBy: {
				dateUploaded: 'desc',
			},
		});
		return this.serializeBooks(books);
	}

	async findBookById(bookId: string, includeHidden = false) {
		const cacheKey = `books:id:${bookId}`;
		const cachedBook = await this.redis.getJSON(cacheKey);
		if (cachedBook) {
			return cachedBook;
		}

		const book = await this.getBookById(bookId, includeHidden);
		if (!book) {
			throw new NotFoundException('Book not found');
		}

		const serialized = this.serializeBook(book);
		await this.redis.setJSON(cacheKey, serialized, this.cacheTTL);
		return serialized;
	}

	async getBookByTitle(title: string, includeHidden = false) {
		const where: any = { title };
		if (!includeHidden) {
			where.isDeleted = false;
		}
		return await this.db.book.findFirst({
			where,
		});
	}

	async findAuthorBookById(
		id: string,
		authorId: string,
		includeHidden = false,
	) {
		const where: any = { id, authorId };
		if (!includeHidden) {
			where.isDeleted = false;
		}
		const book = await this.db.book.findFirst({
			where,
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

		await this.redis.del(`books:id:${id}`);
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

		// Validate everything (genre + file content types) before uploading anything.
		if (bookDTO.genreId) {
			await this.genreService.assertExists(bookDTO.genreId);
		}
		if (book) await assertAllowedTypeFromPath(book.path, ALLOWED_BOOK_LABELS);
		if (bookCover) {
			await assertAllowedTypeFromPath(bookCover.path, ALLOWED_IMAGE_LABELS);
		}

		const title = bookDTO.title || bookRecord.title;
		let bookURL: string | undefined;
		let bookCoverURL: string | undefined;
		try {
			if (book) bookURL = await this.uploadBookFile(book, title);
			if (bookCover) bookCoverURL = await this.uploadCover(bookCover, title);
		} catch (err) {
			// Roll back anything we just uploaded before rethrowing.
			if (bookURL) await this.storageService.deleteFile(bookURL);
			if (bookCoverURL) await this.storageService.deleteFile(bookCoverURL);
			throw err;
		}

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

		// Remove the replaced objects from storage so they don't orphan.
		if (bookURL && bookRecord.bookURL) {
			await this.storageService.deleteFile(bookRecord.bookURL);
		}
		if (bookCoverURL && bookRecord.bookCoverURL) {
			await this.storageService.deleteFile(bookRecord.bookCoverURL);
		}

		await this.redis.del(`books:id:${id}`);
	}

	/** True if the user has a paid/completed order containing this book. */
	private async hasPurchased(userId: string, bookId: string): Promise<boolean> {
		const count = await this.db.orderBook.count({
			where: {
				bookId,
				order: {
					userId,
					status: { in: [OrderStatus.PAID, OrderStatus.COMPLETED] },
				},
			},
		});
		return count > 0;
	}

	/**
	 * Returns a short-lived presigned download URL for a book's file, but only for
	 * users allowed to access it: the author, an admin, or someone who bought it.
	 */
	async getDownloadUrl(bookId: string, user: JwtPayloadType) {
		const book = await this.getBookById(bookId);
		if (!book) {
			throw new NotFoundException('Book not found');
		}

		const isAuthor = book.authorId === user.sub;
		const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;

		if (!isAuthor && !isAdmin && !(await this.hasPurchased(user.sub, bookId))) {
			throw new ForbiddenException('You do not have access to this book');
		}

		const expiresIn = this.configService.get<number>('DOWNLOAD_URL_TTL') ?? 300;
		const url = await this.storageService.getSignedUrl(book.bookURL, expiresIn);
		return { url, expiresIn };
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
		return this.serializeBook(book);
	}

	async getDeletedBooks(authorId: string) {
		const books = await this.db.book.findMany({
			where: {
				authorId,
				isDeleted: true,
			},
			include: { genre: { select: { id: true, name: true } } },
		});
		return this.serializeBooks(books);
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

		const restoredBook = await this.db.book.update({
			where: { id: bookId },
			data: {
				isDeleted: false,
				deletedById: null,
			},
		});

		await this.redis.del(`books:id:${bookId}`);
		return this.serializeBook(restoredBook);
	}

	/**
	 * Admin review decision for a pending book. Records who reviewed it and when,
	 * and flips the status to APPROVED or REJECTED.
	 */
	async reviewBook(bookId: string, adminId: string, status: BookStatus) {
		const book = await this.db.book.update({
			where: { id: bookId },
			data: {
				status,
				reviewedById: adminId,
				dateReviewed: new Date(),
			},
		});

		await this.redis.del(`books:id:${bookId}`);
		return this.serializeBook(book);
	}

	async adminUpdateBook(bookId: string, payload: AdminEditBookDto) {
		if (payload.genreId) {
			await this.genreService.assertExists(payload.genreId);
		}

		const book = await this.db.book.update({
			where: { id: bookId },
			data: payload,
		});

		await this.redis.del(`books:id:${bookId}`);
		return this.serializeBook(book);
	}
}
