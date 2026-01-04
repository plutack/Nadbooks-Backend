import { Module } from '@nestjs/common';
import { BooksModule } from '@/books/books.module';
import { UserModule } from '@/users/users.module';
import { AdminBooksController } from '@/admin/controllers/books/books.controller';
import { UsersController } from '@/admin/controllers/users/users.controller';

@Module({
	imports: [UserModule, BooksModule],
	controllers: [AdminBooksController, UsersController],
})
export class AdminModule {}
