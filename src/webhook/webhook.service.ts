import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { DepositService } from '@/payments/deposit/deposit.service';
import { WithdrawalService } from '@/payments/withdrawal/withdrawal.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WebhookService {
	private readonly secretKey: string;
	constructor(
		private readonly depositService: DepositService,
		private readonly withdrawalService: WithdrawalService,
		private readonly config: ConfigService,
	) {
		this.secretKey = this.config.get<string>('PAYSTACK_SECRET', '');
		if (!this.secretKey) {
			throw new Error('PAYSTACK_SECRET is not set in environment');
		}
	}

	// Verify Paystack signature
	private verifySignature(payload: any, signature: string, secret: string) {
		const hash = crypto
			.createHmac('sha512', secret)
			.update(JSON.stringify(payload))
			.digest('hex');

		return hash === signature;
	}

	async handlePaystackWebhook(payload: any, headers: any) {
		const signature = headers['x-paystack-signature'];

		if (!this.verifySignature(payload, signature, this.secretKey)) {
			console.warn('Invalid Paystack signature');
			return { status: 'unauthorized' };
		}

		// Dispatch based on Paystack event types
		switch (payload.event) {
			case 'charge.success':
				await this.depositService.handleSuccessfulDeposit(payload.data);
				break;

			case 'charge.failed':
				await this.depositService.handleFailedDeposit(payload.data);
				break;

			// case 'transfer.success':
			// 	await this.withdrawalService.applyWithdrawalWebhook(payload.data);
			// 	break;

			// case 'transfer.failed':
			// 	await this.withdrawalService.handleFailedWithdrawal(payload.data);
			// 	break;

			default:
				console.warn('Unknown Paystack webhook event:', payload.event);
		}

		return { status: 'success' };
	}
}
