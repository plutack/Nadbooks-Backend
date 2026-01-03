import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { SharedPaymentsModule } from '@/payments/shared/shared-payments.module';

@Module({
	imports: [SharedPaymentsModule],
	controllers: [OrdersController],
})
export class OrdersModule {}
