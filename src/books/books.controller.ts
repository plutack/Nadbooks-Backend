import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Query,
	Req,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';
import { UploadBook } from '@/helpers/decorators/upload-book.decorator';
import { BooksService } from './books.service';
import { StoreBookDto, UpdateBookDto } from './dtos/book.dto';

@Controller('books')
export class BooksController {
	constructor(private bookService: BooksService) {}

	@Get()
	getBooks(@Query() query: BaseFilterQueryType) {
		return this.bookService.getBooks(query);
	}

	@Post()
	@UseGuards(AuthGuard)
	@UploadBook()
	uploadFile(
		@UploadedFile() book: Express.Multer.File,
		@Body() body: StoreBookDto,
		@CurrentUser() user: JwtPayloadType,
	) {
		return this.bookService.storeBook(body, book, user);
	}

	@Get(':id')
	findBookById(@Param('id') id: string) {
		return this.bookService.findBookById(id);
	}

	@Patch(':id')
	@UseGuards(AuthGuard)
	@UseInterceptors(FileInterceptor('book'))
	updateBookById(
		@Param('id') id: string,
		@UploadedFile() book: Express.Multer.File,
		@Body() body: UpdateBookDto,
		@Req() request: Request,
	) {
		return this.bookService.updateBook(
			id,
			(request?.user as JwtPayloadType).sub,
			body,
			book,
		);
	}

	@Patch("bookmark/:id")
	@UseGuards(AuthGuard)
	bookmarkBook(
		@Param('id') id: string,
		@CurrentUser() user: JwtPayloadType,
	){
		return this.bookService.bookmarkBook(user.sub, id)
	}

	@Delete(':id')
	@UseGuards(AuthGuard)
	deleteBookById(@Param('id') id: string, @Req() request: Request) {
		return this.bookService.deleteBook(
			id,
			(request?.user as JwtPayloadType).sub,
		);
	}
}
