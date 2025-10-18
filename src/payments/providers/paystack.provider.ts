import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import { lastValueFrom } from 'rxjs';
import { PaymentProvider } from '@/payments/interfaces/payment.interface';

@Injectable()
export class PaystackProvider implements PaymentProvider {
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
	async initiatePayment(input: {
		amount: number;
		email?: string;
		metadata?: any; //TODO: properly typecast
	}): Promise<{ reference: string }> {
		const url = `${this.PAYSTACK_BASE}/transaction/initialize`;
		const response = await lastValueFrom(
			this.http.post(
				url,
				{
					amount: input.amount,
					email: input.email,
					metadata: input.metadata,
				},
				{
					headers: {
						Authorization: `Bearer ${this.secretKey}`,
					},
				},
			),
		);
		return { reference: response.data.data.reference };
	}

	async initiateTransfer(input: {
		amount: number;
		reason: string;
		accountNumber: string;
		bankCode: string;
		name: string;
	}): Promise<{ reference: string }> {
		const recipient = await this.createTransferRecipient({
			accountNumber: input.accountNumber,
			bankCode: input.bankCode,
			name: input.name,
		});

		const url = `${this.PAYSTACK_BASE}/transfer`;
		const response = await lastValueFrom(
			this.http.post(
				url,
				{
					source: 'balance',
					amount: input.amount,
					recipient: recipient.recipient_code,
					reason: input.reason,
				},
				{
					headers: {
						Authorization: `Bearer ${this.secretKey}`,
					},
				},
			),
		);

		return { reference: response.data.data.reference };
	}

	private async createTransferRecipient(input: {
		name: string;
		accountNumber: string;
		bankCode: string;
	}): Promise<{ recipient_code: string }> {
		const url = `${this.PAYSTACK_BASE}/transferrecipient`;
		const response = await lastValueFrom(
			this.http.post(
				url,
				{
					type: 'nuban',
					name: input.name,
					account_number: input.accountNumber,
					bank_code: input.bankCode,
					currency: 'NGN',
				},
				{
					headers: {
						Authorization: `Bearer ${this.secretKey}`,
					},
				},
			),
		);
		return response.data.data;
	}

	async verifyPayment(reference: string) {
		const url = `${this.PAYSTACK_BASE}/transaction/verify/${reference}`;

		const response = await lastValueFrom(
			this.http.get(url, {
				headers: {
					Authorization: `Bearer ${this.secretKey}`,
				},
			}),
		);

		return response.data;
	}

	//TODO: properly typecast this too
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
