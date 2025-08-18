import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { StoreBookDto, UpdateBookDto } from './dtos/book.dto';

@Injectable()
export class BooksService {
	constructor(
		private readonly storageService: StorageService,
		private readonly db: PrismaService,
	) {}

	async storeBook(
		bookDTO: StoreBookDto,
		book: Express.Multer.File,
		user: JwtPayloadType,
	) {
		const existingBook = await this.getBookByTitle(bookDTO.title);
		if (existingBook) {
			throw new BadRequestException('Book already exists');
		}
		const bookURL = await this.storageService.storeFile(book, bookDTO.title);
		const newBook = await this.db.book.create({
			data: {
				...bookDTO,
				bookURL,
				userId: user.sub,
				dateUploaded: new Date(),
				dateAuthored: new Date(bookDTO.dateAuthored),
				pageCount: Number(bookDTO.pageCount),
				isMature: Boolean(bookDTO.isMature),
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
		book: Express.Multer.File,
	) {
		if (!bookDTO && !book) {
			throw new BadRequestException('Please provide fields to be updated');
		}
		const bookRecord = await this.findUserBookById(id, userId);
		const updateData: Partial<typeof bookDTO> = {};
		const updatableFields = [
			'isMature',
			'bookURL',
			'author',
			'pageCount',
			'title',
			'dateAuthored',
		];

		let bookURL: string | undefined;
		if (book) {
			bookURL = await this.storageService.storeFile(
				book,
				bookDTO.title || bookRecord.title,
			);
		}
		updatableFields.forEach((field) => {
			if (field !== 'bookURL' && bookDTO[field] !== undefined) {
				updateData[field] =
					field === 'dateAuthored'
						? new Date(bookDTO.dateAuthored as unknown as string)
						: field === 'bookURL'
							? bookURL
							: bookDTO[field];
			}
		});

		const updatedBook = await this.db.book.update({
			where: {
				id,
			},
			data: updateData,
		});
		return updatedBook;
	}

	async bookmarkBook(userId: number, bookId: string){
		await this.findBookById(bookId)
		const hasUserBookmarkedBook = await this.db.bookBookmark.findFirst({
			where:{bookId, userId}
		})

		if (hasUserBookmarkedBook) {
			throw new BadRequestException("You have already bookmarked this book.")
		}
		await this.db.bookBookmark.create({
			data:{
				bookId,
				userId
			}
		})
	}

	async getUserBookmarkedBooks(userId: number, filters: BaseFilterQueryType){
		return this.db.bookBookmark.findMany({
			where:{
				userId
			},
			select:{
				book:true, 
				id:false, 
				bookId:false,
				createdAt:true
			},
			take:filters.limit || 20,
			skip: filters.skip || 0
		})
	}
}
