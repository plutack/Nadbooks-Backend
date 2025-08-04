import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StoreBookDto, UpdateBookDto } from './dtos/book.dto';
import { BooksService } from './books.service';
import { AuthGuard } from '@/auth/auth.guard';
import { Request } from 'express';

@Controller('books')
export class BooksController {
    constructor(private bookService: BooksService){}

    @Post()
    @UseGuards(AuthGuard)
    @UseInterceptors(FileInterceptor('book'))
    uploadFile(@UploadedFile() book: Express.Multer.File, @Body() body: StoreBookDto, @Req() request: Request) {
        return this.bookService.storeBook(body, book, request?.user as JwtPayloadType)
    }


    @Get(":id")
    findBookById(@Param("id") id: string){
        return this.bookService.findBookById(id)
    }


    @Patch(":id")
    @UseGuards(AuthGuard)
    @UseInterceptors(FileInterceptor('book'))
    updateBookById(@Param("id") id: string, @UploadedFile() book: Express.Multer.File, @Body() body: UpdateBookDto, @Req() request: Request){
        return this.bookService.updateBook(id, (request?.user as JwtPayloadType).sub, body, book)
    }

    @Delete(":id")
    @UseGuards(AuthGuard)
    deleteBookById(@Param("id") id: string, @Req() request: Request){
        return this.bookService.deleteBook(id, (request?.user as JwtPayloadType).sub)
    }

}
