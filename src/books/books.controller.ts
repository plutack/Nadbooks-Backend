import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	Patch,
	Post,
	Query,
	UploadedFiles,
	UseGuards,
} from '@nestjs/common';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';
import { BooksService } from '@/books/books.service';
import {
	BookFilterDto,
	StoreBookDto,
	UpdateBookDto,
} from '@/books/dtos/book.dto';
import { UploadBookAndCover } from '@/helpers/decorators/upload-book.decorator';
import { JwtPayloadType } from '@/types/jwt.type';

@Controller('books')
export class BooksController {
	constructor(private bookService: BooksService) {}

	@Get('me/deleted')
	@UseGuards(AuthGuard)
	getDeletedBooks(@CurrentUser() user: JwtPayloadType) {
		return this.bookService.getDeletedBooks(user.sub);
	}

	@Post(':id/restore')
	@UseGuards(AuthGuard)
	@HttpCode(200)
	restoreBook(@Param('id') id: string, @CurrentUser() user: JwtPayloadType) {
		return this.bookService.restoreBook(id, user);
	}

	@Get()
	getBooks(@Query() query: BookFilterDto) {
		return this.bookService.getBooks(query);
	}

	@Post()
	@UseGuards(AuthGuard)
	@UploadBookAndCover()
	uploadFile(
		@UploadedFiles()
		files: {
			book?: Express.Multer.File[];
			bookCover?: Express.Multer.File[];
		},
		@Body() dto: StoreBookDto,
		@CurrentUser() user: JwtPayloadType,
	) {
		if (!files.book?.[0]) {
			throw new BadRequestException('Book file is required');
		}
		if (!files.bookCover?.[0]) {
			throw new BadRequestException('Book cover file is required');
		}

		return this.bookService.storeBook(
			dto,
			files.book[0],
			files.bookCover[0],
			user,
		);
	}

	@Patch(':id')
	@HttpCode(204)
	@UseGuards(AuthGuard)
	@UploadBookAndCover()
	updateBookById(
		@Param('id') id: string,
		@UploadedFiles()
		files: {
			book?: Express.Multer.File[];
			bookCover?: Express.Multer.File[];
		},
		@Body() body: UpdateBookDto,
		@CurrentUser() user: JwtPayloadType,
	) {
		return this.bookService.updateBook(
			id,
			user.sub,
			body,
			files.book?.[0],
			files.bookCover?.[0],
		);
	}

	@Post('bookmarks/:id')
	@UseGuards(AuthGuard)
	@HttpCode(201)
	bookmarkBook(@Param('id') id: string, @CurrentUser() user: JwtPayloadType) {
		return this.bookService.bookmarkBook(user.sub, id);
	}

	@Delete('bookmarks/:id')
	@HttpCode(204)
	@UseGuards(AuthGuard)
	removeBookFromBookmark(
		@Param('id') id: string,
		@CurrentUser() user: JwtPayloadType,
	) {
		return this.bookService.removeBookFromBookmark(user.sub, id);
	}

	@Delete(':id')
	@HttpCode(204)
	@UseGuards(AuthGuard)
	deleteBookById(@Param('id') id: string, @CurrentUser() user: JwtPayloadType) {
		return this.bookService.deleteBook(id, user.sub);
	}
}
