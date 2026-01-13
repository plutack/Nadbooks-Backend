import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '@/auth/auth.guard';
import { TransactionService } from '@/payments/shared/transaction.service';
import { TransactionsController } from './transactions.controller';

describe('TransactionsController', () => {
	let controller: TransactionsController;

	const mockTransactionService = {
		getAllTransactions: jest.fn(),
		getTransactionsByUser: jest.fn(),
		getTransactionByReference: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [TransactionsController],
			providers: [
				{
					provide: TransactionService,
					useValue: mockTransactionService,
				},
			],
		})
			.overrideGuard(AuthGuard)
			.useValue({ canActivate: () => true })
			.compile();

		controller = module.get<TransactionsController>(TransactionsController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
