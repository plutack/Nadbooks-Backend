import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SendEmailDto } from './interfaces/email-provider.interface';

@Injectable()
export class EmailService {
	constructor(@InjectQueue('email') private readonly emailQueue: Queue) {}

	async sendEmail(dto: SendEmailDto) {
		await this.emailQueue.add('send', dto, {
			attempts: 3,
			backoff: {
				type: 'exponential',
				delay: 1000,
			},
		});
	}
}
