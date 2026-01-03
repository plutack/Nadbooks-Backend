import { Test, TestingModule } from '@nestjs/testing';
import { OrderPaymentService } from './order-payment.service';
import { PrismaService } from '@/prisma/prisma.service';
import { OrderService } from '@/payments/shared/order.service';
import { TransactionService } from '@/payments/shared/transaction.service';
import { WalletService } from '@/wallet/wallet.service';
import { PaystackDepositProvider } from '../deposit/providers/paystack-deposit.provider';
import { CryptoDepositProvider } from '../deposit/providers/crypto-deposit.provider';

describe('OrderPaymentService', () => {
	let service: OrderPaymentService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				OrderPaymentService,
				{ provide: PrismaService, useValue: {} },
				{ provide: OrderService, useValue: {} },
				{ provide: TransactionService, useValue: {} },
				{ provide: WalletService, useValue: {} },
				{ provide: PaystackDepositProvider, useValue: {} },
				{ provide: CryptoDepositProvider, useValue: {} },
			],
		}).compile();

		service = module.get<OrderPaymentService>(OrderPaymentService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
