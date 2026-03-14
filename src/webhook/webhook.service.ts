import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PaymentMethod } from 'generated/prisma';
import { DepositService } from '@/payments/deposit/deposit.service';
import { WithdrawalService } from '@/payments/withdrawal/withdrawal.service';

@Injectable()
export class WebhookService {
	private readonly paystackSecret: string;
	private readonly alchemySecret: string;
	constructor(
		private readonly depositService: DepositService,
		private readonly withdrawalService: WithdrawalService,
		config: ConfigService,
	) {
		this.paystackSecret = config.getOrThrow<string>('PAYSTACK_SECRET', '');
		this.alchemySecret = config.getOrThrow<string>('ALCHEMY_SECRET', '');
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

		if (!this.verifySignature(payload, signature, this.paystackSecret)) {
			return { status: 'unauthorized' };
		}

		// Dispatch based on Paystack event types
		switch (payload.event) {
			case 'charge.success':
				await this.depositService.handleSuccessfulPaystackDeposit(payload.data);
				break;

			case 'charge.failed':
				await this.depositService.handleFailedPaystackDeposit(payload.data);
				break;

			case 'transfer.success':
				await this.withdrawalService.handleSuccessfulPaystackWithdrawal(
					payload.data,
				);
				break;

			case 'transfer.failed':
				await this.withdrawalService.handleFailedPaystackWithdrawal(
					payload.data,
				);
				break;

			default:
				console.warn('Unknown Paystack webhook event:', payload.event);
		}

		return { status: 'success' };
	}

	async handleCryptoWebhook(payload: any, headers: any) {
		const signature = headers['x-alchemy-signature'];

		console.log('payload:', payload);
		if (!this.verifySignature(payload, signature, this.alchemySecret)) {
			console.log('payload:', payload);
			return { status: 'unauthorized' };
		}

		const activities = payload.event?.activity;

		if (!activities || !Array.isArray(activities)) {
			console.log('called 3');

			return { status: 'success' };
		}

		for (const activity of activities) {
			console.log('called 2');
			try {
				await this.depositService.verifyDeposit(PaymentMethod.CRYPTO, {
					hash: activity.hash,
					buyerAddress: activity.fromAddress,
					transferedAmount: activity.value,
				} as any);
			} catch (e) {
				console.error('Error processing crypto webhook activity:', e);
			}
		}

		return { status: 'success' };
	}
}
