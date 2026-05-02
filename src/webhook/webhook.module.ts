import { Module } from '@nestjs/common';
import { DepositModule } from '@/payments/deposit/deposit.module';
import { SharedPaymentsModule } from '@/payments/shared/shared-payments.module';
import { WithdrawalModule } from '@/payments/withdrawal/withdrawal.module';
import { RedisModule } from '@/redis/redis.module';
import { WebhookController } from '@/webhook/webhook.controller';
import { WebhookService } from '@/webhook/webhook.service';
import { WebhookQueueService } from '@/webhook/webhook-queue.service';

@Module({
	imports: [DepositModule, WithdrawalModule, RedisModule, SharedPaymentsModule],
	controllers: [WebhookController],
	providers: [WebhookService, WebhookQueueService],
})
export class WebhookModule {}
