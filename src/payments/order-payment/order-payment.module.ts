import { Module } from '@nestjs/common';
import { OrderPaymentService } from '@/payments/order-payment/order-payment.service';
import { WalletModule } from '@/wallet/wallet.module';
import { SharedPaymentsModule } from '../shared/shared-payments.module';

@Module({
	imports: [SharedPaymentsModule, WalletModule],
	providers: [OrderPaymentService],
	exports: [OrderPaymentService],
})
export class OrderPaymentModule {}
