import {
	Body,
	Controller,
	Get,
	HttpCode,
	Param,
	Patch,
	Query,
} from '@nestjs/common';
import { BookStatus } from 'generated/prisma';
import { AdminEditBookDto } from '@/admin/dto/books/edit-book.dto';
import { ReviewBookDto } from '@/admin/dto/books/review-book.dto';
import { CurrentUser } from '@/auth/auth.guard';
import { AdminAuth } from '@/auth/decorators/roles.decorator';
import { BooksService } from '@/books/books.service';
import { BaseFilterDto } from '@/common/dto/filters.dto';
import { JwtPayloadType } from '@/types/jwt.type';

@Controller('admin/books')
@AdminAuth()
export class AdminBooksController {
	constructor(private booksService: BooksService) {}

	@Get()
	getBooks(@Query() { limit, skip }: BaseFilterDto) {
		return this.booksService.getBooks({ limit, skip, includeHidden: true });
	}

	@Get(':id')
	getBookById(@Param('id') id: string) {
		return this.booksService.findBookById(id, true);
	}

	@Patch(':id')
	@HttpCode(204)
	updateBookById(@Param('id') id: string, @Body() body: AdminEditBookDto) {
		return this.booksService.adminUpdateBook(id, body);
	}

	@Patch('/ban/:id')
	@HttpCode(204)
	banBookById(@Param('id') id: string, @CurrentUser() user: JwtPayloadType) {
		return this.booksService.banBook(id, user.sub);
	}

	@Patch(':id/review')
	@HttpCode(200)
	reviewBook(
		@Param('id') id: string,
		@Body() body: ReviewBookDto,
		@CurrentUser() user: JwtPayloadType,
	) {
		return this.booksService.reviewBook(
			id,
			user.sub,
			body.status as unknown as BookStatus,
		);
	}
}
