import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Query,
	UseGuards,
} from '@nestjs/common';
import { AdminEditBookDto } from '@/admin/dto/books/edit-book.dto';
import { AdminAuthGuard } from '@/admin/guards/admin.guard';
import { AdminBooksService } from '@/admin/services/books/books.service';
import { BaseFilterQueryType } from '@/types/filters.type';

@Controller('admin/books')
@UseGuards(AdminAuthGuard)
export class AdminBooksController {
	constructor(private adminBookService: AdminBooksService) {}

	@Get()
	getBooks(@Query() { limit, skip }: BaseFilterQueryType) {
		return this.adminBookService.getBooks(limit, skip);
	}

	@Get(':id')
	getBookById(@Param('id') id: string) {
		return this.adminBookService.findBookById(id);
	}

	@Patch(':id')
	updateBookById(@Param('id') id: string, @Body() body: AdminEditBookDto) {
		return this.adminBookService.update(id, body);
	}

	@Patch('/ban/:id')
	banBookById(@Param('id') id: string) {
		return this.adminBookService.banBook(id);
	}
}
