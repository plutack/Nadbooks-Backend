import { Test, TestingModule } from '@nestjs/testing';
import { OrderPaymentService } from './order-payment.service';

describe('OrderPaymentService', () => {
  let service: OrderPaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderPaymentService],
    }).compile();

    service = module.get<OrderPaymentService>(OrderPaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
