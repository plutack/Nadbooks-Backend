import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
	EmailProviderInterface,
	SendEmailDto,
} from '../interfaces/email-provider.interface';

@Injectable()
export class ResendEmailProvider implements EmailProviderInterface {
	private readonly resend: Resend | null = null;
	private readonly logger = new Logger(ResendEmailProvider.name);
	private readonly defaultFrom: string;

	constructor(private readonly config: ConfigService) {
		const apiKey = this.config.get<string>('RESEND_API_KEY');
		if (apiKey) {
			this.resend = new Resend(apiKey);
		}
		this.defaultFrom =
			this.config.get<string>('EMAIL_FROM') || 'noreply@nadbooks.com';
	}

	async send(dto: SendEmailDto): Promise<void> {
		if (!this.resend) {
			this.logger.warn(
				`RESEND_API_KEY is missing. Silently dropping email to ${dto.to} (Subject: ${dto.subject})`,
			);
			return;
		}

		try {
			const htmlBody = `<p>Your code is: <strong>${dto.variables?.code}</strong></p>`;

			await this.resend.emails.send({
				from: this.defaultFrom,
				to: dto.to,
				subject: dto.subject,
				html: htmlBody,
			});
			this.logger.log(`Email sent successfully to ${dto.to}`);
		} catch (error) {
			this.logger.error(`Failed to send email to ${dto.to}`, error);
		}
	}
}
