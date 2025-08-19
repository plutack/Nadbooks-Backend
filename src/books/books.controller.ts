import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Query,
	Req,
	UploadedFiles,
	UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';
import { UploadBookAndCover } from '@/helpers/decorators/upload-book.decorator';
import { BaseFilterQueryType } from '@/types/filters.type';
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
	@UploadBookAndCover()
	uploadFile(
		@UploadedFiles()
		files: {
			book?: Express.Multer.File[];
			bookCover?: Express.Multer.File[];
		},
		@Body() body: StoreBookDto,
		@CurrentUser() user: JwtPayloadType,
	) {
		if (!files.book?.[0]) {
			throw new BadRequestException('Book file is required');
		}
		if (!files.bookCover?.[0]) {
			throw new BadRequestException('Book cover is required');
		}

		return this.bookService.storeBook(
			body,
			files.book[0],
			files.bookCover[0],
			user,
		);
	}

	@Patch(':id')
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
		@Req() request: Request,
	) {
		return this.bookService.updateBook(
			id,
			(request?.user as JwtPayloadType).sub,
			body,
			files.book?.[0],
			files.bookCover?.[0],
		);
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
