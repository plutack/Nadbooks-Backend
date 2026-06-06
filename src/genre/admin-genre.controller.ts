import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	Patch,
	Post,
} from '@nestjs/common';
import { AdminAuth } from '@/auth/decorators/roles.decorator';
import { CreateGenreDto, UpdateGenreDto } from './dtos/genre.dto';
import { GenreService } from './genre.service';

@Controller('admin/genres')
@AdminAuth()
export class AdminGenreController {
	constructor(private readonly genreService: GenreService) {}

	@Get()
	list() {
		return this.genreService.list();
	}

	@Post()
	create(@Body() body: CreateGenreDto) {
		return this.genreService.create(body.name);
	}

	@Patch(':id')
	rename(@Param('id') id: string, @Body() body: UpdateGenreDto) {
		return this.genreService.rename(id, body.name);
	}

	@Delete(':id')
	@HttpCode(200)
	remove(@Param('id') id: string) {
		return this.genreService.remove(id);
	}
}
