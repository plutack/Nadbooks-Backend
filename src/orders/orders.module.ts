import { Module } from '@nestjs/common';
import { SharedPaymentsModule } from '@/payments/shared/shared-payments.module';
import { OrdersController } from './orders.controller';

@Module({
	imports: [SharedPaymentsModule],
	controllers: [OrdersController],
})
export class OrdersModule {}
