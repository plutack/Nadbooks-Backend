import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '@/auth/auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { BooksService } from '@/books/books.service';
import { AdminBooksController } from './books.controller';

describe('AdminBooksController', () => {
	let controller: AdminBooksController;

	const mockBooksService = {
		getBooks: jest.fn(),
		findBookById: jest.fn(),
		adminUpdateBook: jest.fn(),
		banBook: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AdminBooksController],
			providers: [
				{
					provide: BooksService,
					useValue: mockBooksService,
				},
			],
		})
			.overrideGuard(AuthGuard)
			.useValue({ canActivate: () => true })
			.overrideGuard(RolesGuard)
			.useValue({ canActivate: () => true })
			.compile();

		controller = module.get<AdminBooksController>(AdminBooksController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
