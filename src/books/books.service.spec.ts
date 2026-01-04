import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from './books.service';
import { ImageProcessingService } from '@/common/image/image-processing.service';

import { StorageService } from '@/storage/storage.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('BooksService', () => {
	let service: BooksService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				BooksService,
				{
					provide: ImageProcessingService,
					useValue: {
						resizeAndOptimize: jest.fn(),
					},
				},
				{
					provide: StorageService,
					useValue: {},
				},
				{
					provide: PrismaService,
					useValue: {},
				},
			],
		}).compile();

		service = module.get<BooksService>(BooksService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
