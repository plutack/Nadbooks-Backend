import { Module } from '@nestjs/common';
import { QueueModule } from '@/queue/queue.module';
import { EmailService } from './email.service';
import { EmailWorker } from './email.worker';
import { ResendEmailProvider } from './providers/resend.provider';

@Module({
	imports: [QueueModule.forQueue('email')],
	providers: [EmailService, EmailWorker, ResendEmailProvider],
	exports: [EmailService],
})
export class EmailModule {}
