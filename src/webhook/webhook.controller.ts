import { Controller, Post, Body, Req } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { Request } from 'express';

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
}
