import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CheckoutService } from '@/payments/checkout.service';
import { PaystackService } from '@/payments/providers/paystack.provider';

@Module({
	imports: [HttpModule],
	providers: [CheckoutService, PaystackService],
	exports: [CheckoutService],
})
export class PaymentModule {}
