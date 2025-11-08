import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import { lastValueFrom } from 'rxjs';
import { DepositProviderInterface } from '../interfaces/deposit-provider.interface';

@Injectable()
export class PaystackDepositProvider implements DepositProviderInterface {
	private readonly PAYSTACK_BASE = 'https://api.paystack.co';
	private readonly secretKey: string;

	constructor(
		private readonly http: HttpService,
		private readonly config: ConfigService,
	) {
		this.secretKey = this.config.get<string>('PAYSTACK_SECRET_KEY', '');
		if (!this.secretKey) {
			throw new Error('PAYSTACK_SECRET_KEY is not set in environment');
		}
	}

	async initiateDeposit(input: {
		amount: number;
		email?: string;
		reference: string;
		metadata?: Record<string, any>;
	}): Promise<{ reference: string; paymentUrl: string }> {
		const url = `${this.PAYSTACK_BASE}/transaction/initialize`;

		const response = await lastValueFrom(
			this.http.post(
				url,
				{
					amount: input.amount,
					email: input.email,
					reference: input.reference,
					metadata: input.metadata,
				},
				{
					headers: {
						Authorization: `Bearer ${this.secretKey}`,
					},
				},
			),
		);

		const data = response.data?.data;

		return {
			reference: data.reference,
			paymentUrl: data.authorization_url,
		};
	}

	async verifyPayment(reference: string): Promise<{
		success: boolean;
		providerResponse: any;
	}> {
		const url = `${this.PAYSTACK_BASE}/transaction/verify/${reference}`;

		const response = await lastValueFrom(
			this.http.get(url, {
				headers: {
					Authorization: `Bearer ${this.secretKey}`,
				},
			}),
		);

		const result = response.data;

		const status = result.data?.status;

		return {
			success: status === 'success',
			providerResponse: result,
		};
	}

	handleWebhook(payload: any, headers: Record<string, string>) {
		const signature = headers['x-paystack-signature'];

		const hash = crypto
			.createHmac('sha512', this.secretKey)
			.update(JSON.stringify(payload))
			.digest('hex');

		if (hash !== signature) {
			throw new Error('Invalid webhook signature');
		}

		return payload;
	}
}
