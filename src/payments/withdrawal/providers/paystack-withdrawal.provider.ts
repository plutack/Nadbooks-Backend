import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import {
	PaystackWithdrawalInput,
	PaystackWithdrawalProviderInterface,
} from '@/payments/withdrawal/interfaces/provider.interface';

@Injectable()
export class PaystackWithdrawalProvider implements PaystackWithdrawalProviderInterface {
	private readonly PAYSTACK_BASE = 'https://api.paystack.co';
	private readonly secretKey: string;

	constructor(
		private readonly http: HttpService,
		config: ConfigService,
	) {
		this.secretKey = config.getOrThrow<string>('PAYSTACK_SECRET');
	}

	/** Create a transfer recipient and return the recipient_code */
	private async createTransferRecipient(input: {
		name: string;
		accountNumber: string;
		bankCode: string;
	}): Promise<string> {
		const response = await lastValueFrom(
			this.http.post(
				`${this.PAYSTACK_BASE}/transferrecipient`,
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

		return response.data.data.recipient_code;
	}

	/** Initiate a bank withdrawal */
	async initiateWithdrawal(input: PaystackWithdrawalInput): Promise<string> {
		const recipientCode = await this.createTransferRecipient({
			accountNumber: input.accountNumber,
			bankCode: input.bankCode,
			name: input.name,
		});

		const response = await lastValueFrom(
			this.http.post(
				`${this.PAYSTACK_BASE}/transfer`,
				{
					source: 'balance',
					amount: input.amount * 100, // Paystack expects kobo
					recipient: recipientCode,
					reason: input.reason,
				},
				{
					headers: {
						Authorization: `Bearer ${this.secretKey}`,
					},
				},
			),
		);

		return response.data.data.reference;
	}
}
