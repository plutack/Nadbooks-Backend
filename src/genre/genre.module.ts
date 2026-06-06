import { Module } from '@nestjs/common';
import { AdminGenreController } from './admin-genre.controller';
import { GenreController } from './genre.controller';
import { GenreService } from './genre.service';

@Module({
	controllers: [GenreController, AdminGenreController],
	providers: [GenreService],
	exports: [GenreService],
})
export class GenreModule {}
