import { AdminEditBookDto } from '@/admin/dto/books/edit-book.dto';
import { AdminBooksService } from '@/admin/services/books/books.service';
import { BaseFilterQueryType } from '@/types/filters.type';
import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('admin/books')
@ApiTags('Admin Books')
export class AdminBooksController {
	constructor(private adminBookService: AdminBooksService) {}

	@Get()
	@ApiOperation({
		summary: 'Returns the books on the platform',
		description: 'Returns a paginated list of books on the platform',
	})
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
