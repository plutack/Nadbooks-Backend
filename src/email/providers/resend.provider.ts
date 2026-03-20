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
			// For a real app, you would load HTML templates and compile them with variables.
			// Here we construct a simple HTML body for the verification email as a starting point.
			const htmlBody = `<p>Hello,</p><p>Your verification code is: ${dto.variables?.code}</p>`;

			// If we wanted to expand, we'd use dto.templateName to pick a template file.

			await this.resend.emails.send({
				from: this.defaultFrom,
				to: dto.to,
				subject: dto.subject,
				html: htmlBody,
			});
			this.logger.log(`Email sent successfully to ${dto.to}`);
		} catch (error) {
			this.logger.error(`Failed to send email to ${dto.to}`, error);
			// We intentionally do not throw here to fail silently if it's an email delivery issue,
			// as requested, though you might want to rethrow for queue retries in a strict setup.
		}
	}
}
