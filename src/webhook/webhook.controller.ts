import { Body, Controller, Post, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import { WebhookService } from '@/webhook/webhook.service';
import { WebhookQueueService } from '@/webhook/webhook-queue.service';

@Controller('webhook')
export class WebhookController {
	constructor(
		private readonly webhookService: WebhookService,
		private readonly webhookQueueService: WebhookQueueService,
	) {}

	@Post('paystack')
	async handlePaystack(@Body() payload: any, @Req() req: Request) {
		await this.webhookService.handlePaystackWebhook(payload, req.headers);
		await this.webhookQueueService.addToQueue('paystack', payload);
		return { status: 'queued' };
	}

	@Post('crypto')
	async handleCrypto(@Req() req: RawBodyRequest<Request>) {
		if (!req.rawBody) {
			console.log('❌ Webhook failed: req.rawBody is missing!');
			console.log('Regular req.body is:', req.body);
			return { status: 'error', message: 'Raw body required' };
		}

		const signature = req.headers['x-alchemy-signature'] as string;
		const isValid = this.webhookService.verifyAlchemySignature(
			req.rawBody,
			signature,
		);

		if (!isValid) {
			return { status: 'unauthorized' };
		}

		const body =
			typeof req.rawBody === 'string'
				? req.rawBody
				: req.rawBody.toString('utf8');
		const payload = JSON.parse(body);

		await this.webhookQueueService.addToQueue('crypto', payload);

		return { status: 'queued' };
	}
}
