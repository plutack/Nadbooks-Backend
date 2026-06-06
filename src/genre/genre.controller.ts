import { Controller, Get } from '@nestjs/common';
import { GenreService } from './genre.service';

@Controller('genres')
export class GenreController {
	constructor(private readonly genreService: GenreService) {}

	/** Public list of genres for browsing/filtering and the upload form. */
	@Get()
	list() {
		return this.genreService.list();
	}
}
