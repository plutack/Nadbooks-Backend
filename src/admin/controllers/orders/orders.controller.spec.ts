import { Test, TestingModule } from '@nestjs/testing';
import { AdminOrdersController } from './orders.controller';
import { OrderService } from '@/payments/shared/order.service';
import { AuthGuard } from '@/auth/auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';

describe('AdminOrdersController', () => {
	let controller: AdminOrdersController;

	const mockOrderService = {
		getAllOrders: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AdminOrdersController],
			providers: [
				{
					provide: OrderService,
					useValue: mockOrderService,
				},
			],
		})
			.overrideGuard(AuthGuard)
			.useValue({ canActivate: () => true })
			.overrideGuard(RolesGuard)
			.useValue({ canActivate: () => true })
			.compile();

		controller = module.get<AdminOrdersController>(AdminOrdersController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
