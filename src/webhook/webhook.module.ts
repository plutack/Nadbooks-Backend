import { Module } from '@nestjs/common';
import { DepositModule } from '@/payments/deposit/deposit.module';
import { WithdrawalModule } from '@/payments/withdrawal/withdrawal.module';
import { WebhookController } from '@/webhook/webhook.controller';
import { WebhookService } from '@/webhook/webhook.service';

@Module({
	imports: [DepositModule, WithdrawalModule],
	controllers: [WebhookController],
	providers: [WebhookService],
})
export class WebhookModule {}
