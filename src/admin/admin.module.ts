import { Module } from '@nestjs/common';
import { AdminBooksService } from './services/books/books.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { AdminBooksController } from './controllers/books/books.controller';
import { UsersService } from './services/users/users.service';
import { UsersController } from './controllers/users/users.controller';

@Module({
	imports: [PrismaModule],
	providers: [AdminBooksService, UsersService],
	controllers: [AdminBooksController, UsersController],
})
export class AdminModule {}
