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
import { AuthGuard } from '@/auth/auth.guard';
import { BooksService } from '@/books/books.service';
import { BaseFilterQueryType } from '@/types/filters.type';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { Role } from 'generated/prisma';

@Controller('admin/books')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminBooksController {
	constructor(private booksService: BooksService) {}

	@Get()
	getBooks(@Query() { limit, skip }: BaseFilterQueryType) {
		return this.booksService.getBooks({ limit, skip, includeHidden: true });
	}

	@Get(':id')
	getBookById(@Param('id') id: string) {
		return this.booksService.findBookById(id);
	}

	@Patch(':id')
	updateBookById(@Param('id') id: string, @Body() body: AdminEditBookDto) {
		return this.booksService.adminUpdateBook(id, body);
	}

	@Patch('/ban/:id')
	banBookById(@Param('id') id: string) {
		return this.booksService.banBook(id);
	}
}
