import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrderService } from '@/payments/shared/order.service';
import { AuthGuard } from '@/auth/auth.guard';

describe('OrdersController', () => {
	let controller: OrdersController;

	const mockOrderService = {
		getAllOrders: jest.fn(),
		getUserOrder: jest.fn(),
		getOrderById: jest.fn(),
		createOrder: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [OrdersController],
			providers: [
				{
					provide: OrderService,
					useValue: mockOrderService,
				},
			],
		})
			.overrideGuard(AuthGuard)
			.useValue({ canActivate: () => true })
			.compile();

		controller = module.get<OrdersController>(OrdersController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
