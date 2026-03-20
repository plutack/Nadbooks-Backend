import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SendEmailDto } from './interfaces/email-provider.interface';
import { ResendEmailProvider } from './providers/resend.provider';

@Processor('email')
export class EmailWorker extends WorkerHost {
	private readonly logger = new Logger(EmailWorker.name);

	constructor(private readonly emailProvider: ResendEmailProvider) {
		super();
	}

	async process(job: Job<SendEmailDto, any, string>): Promise<any> {
		this.logger.log(`Processing email job for ${job.data.to}`);
		await this.emailProvider.send(job.data);
	}
}
