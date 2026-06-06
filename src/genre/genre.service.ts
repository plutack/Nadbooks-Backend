import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class GenreService {
	constructor(private readonly db: PrismaService) {}

	/** All genres, alphabetical — used for upload/filter dropdowns. */
	async list() {
		return this.db.genre.findMany({ orderBy: { name: 'asc' } });
	}

	async create(name: string) {
		const existing = await this.db.genre.findUnique({ where: { name } });
		if (existing) {
			throw new ConflictException('A genre with this name already exists');
		}
		return this.db.genre.create({ data: { name } });
	}

	async rename(id: string, name: string) {
		await this.findByIdOrThrow(id);

		const clash = await this.db.genre.findFirst({
			where: { name, id: { not: id } },
		});
		if (clash) {
			throw new ConflictException('A genre with this name already exists');
		}

		return this.db.genre.update({ where: { id }, data: { name } });
	}

	async remove(id: string) {
		await this.findByIdOrThrow(id);

		const inUse = await this.db.book.count({ where: { genreId: id } });
		if (inUse > 0) {
			throw new ConflictException(
				`Cannot delete genre: ${inUse} book(s) still use it. Reassign or remove those books first.`,
			);
		}

		await this.db.genre.delete({ where: { id } });
		return { message: 'Genre deleted' };
	}

	private async findByIdOrThrow(id: string) {
		const genre = await this.db.genre.findUnique({ where: { id } });
		if (!genre) {
			throw new NotFoundException('Genre not found');
		}
		return genre;
	}

	/** Throws BadRequest if the genre id doesn't exist — used when creating/editing books. */
	async assertExists(id: string) {
		const genre = await this.db.genre.findUnique({ where: { id } });
		if (!genre) {
			throw new BadRequestException('Invalid genre');
		}
		return genre;
	}
}
