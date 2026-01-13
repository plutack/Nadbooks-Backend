import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { WebhookService } from '@/webhook/webhook.service';

@Controller('webhook')
export class WebhookController {
	constructor(private readonly webhookService: WebhookService) {}

	@Post('paystack')
	async handlePaystack(@Body() payload: any, @Req() req: Request) {
		return await this.webhookService.handlePaystackWebhook(
			payload,
			req.headers,
		);
	}
	@Post('crypto')
	async handleCrypto(@Body() payload: any, @Req() req: Request) {
		console.log('this was called');
		return await this.webhookService.handleCryptoWebhook(payload, req.headers);
	}
}
