import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { StorageModule } from '@/storage/storage.module';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
	imports: [PrismaModule, StorageModule],
	controllers: [BooksController],
	providers: [BooksService],
})
export class BooksModule {}
