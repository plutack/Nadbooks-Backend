import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PaymentService } from '@/payments/payment.service';
import { CheckoutService } from '@/payments/services/checkout.service';

@Module({
	imports: [HttpModule],
	providers: [CheckoutService, PaymentService],
	exports: [CheckoutService],
})
export class PaymentModule {}
