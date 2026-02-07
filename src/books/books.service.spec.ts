import { Test, TestingModule } from '@nestjs/testing';
import { ImageProcessingService } from '@/common/image/image-processing.service';
import { PrismaService } from '@/prisma/prisma.service';

import { StorageService } from '@/storage/storage.service';
import { RedisService } from '@/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { BooksService } from './books.service';

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
					useValue: {
						book: {
							findMany: jest.fn(),
							findFirst: jest.fn(),
							update: jest.fn(),
							create: jest.fn(),
							delete: jest.fn(),
						},
						bookBookmark: {
							create: jest.fn(),
							delete: jest.fn(),
							findMany: jest.fn(),
						},
					},
				},
				{
					provide: RedisService,
					useValue: {
						get: jest.fn(),
						set: jest.fn(),
						del: jest.fn(),
						getJSON: jest.fn(),
						setJSON: jest.fn(),
					},
				},
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn().mockReturnValue(900),
					},
				},
			],
		}).compile();

		service = module.get<BooksService>(BooksService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	it('should check cache for getBooks', async () => {
		const redisService = service['redis'];
		const spy = jest.spyOn(redisService, 'getJSON');

		// Mock db findMany to avoid actual DB call error if cache miss logic proceeds
		service['db'].book.findMany = jest.fn().mockResolvedValue([]);

		await service.getBooks({});
		expect(spy).toHaveBeenCalled();
	});
});
