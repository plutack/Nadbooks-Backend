import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '@/auth/auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { TransactionService } from '@/payments/shared/transaction.service';
import { AdminTransactionsController } from './transactions.controller';

describe('AdminTransactionsController', () => {
	let controller: AdminTransactionsController;

	const mockTransactionService = {
		getAllTransactions: jest.fn(),
		getTransactionsByUser: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AdminTransactionsController],
			providers: [
				{
					provide: TransactionService,
					useValue: mockTransactionService,
				},
			],
		})
			.overrideGuard(AuthGuard)
			.useValue({ canActivate: () => true })
			.overrideGuard(RolesGuard)
			.useValue({ canActivate: () => true })
			.compile();

		controller = module.get<AdminTransactionsController>(
			AdminTransactionsController,
		);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
