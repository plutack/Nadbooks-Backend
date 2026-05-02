import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import {
	BankAccountResolution,
	PaystackBank,
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

	/** Resolve bank account to get account name */
	async resolveBankAccount(input: BankAccountResolution): Promise<string> {
		const response = await lastValueFrom(
			this.http.get(`${this.PAYSTACK_BASE}/bank/resolve`, {
				params: {
					account_number: input.accountNumber,
					bank_code: input.bankCode,
				},
				headers: {
					Authorization: `Bearer ${this.secretKey}`,
				},
			}),
		);

		return response.data.data.account_name;
	}

	/** Get list of Nigerian banks */
	async getBanks(): Promise<PaystackBank[]> {
		const response = await lastValueFrom(
			this.http.get(`${this.PAYSTACK_BASE}/bank`, {
				headers: {
					Authorization: `Bearer ${this.secretKey}`,
				},
			}),
		);

		return response.data.data.map((bank: { name: string; code: string }) => ({
			name: bank.name,
			code: bank.code,
		}));
	}

	/** Create a transfer recipient and return the recipient_code */
	private async createTransferRecipient(input: {
		name: string;
		accountNumber: string;
		bankCode: string;
	}): Promise<string> {
		try {
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
		} catch (error: any) {
			const paystackMessage = error.response?.data?.message || error.message;
			throw new Error(`Paystack transfer recipient error: ${paystackMessage}`);
		}
	}

	/** Initiate a bank withdrawal */
	async initiateWithdrawal(input: PaystackWithdrawalInput): Promise<string> {
		const recipientCode = await this.createTransferRecipient({
			accountNumber: input.accountNumber,
			bankCode: input.bankCode,
			name: input.name,
		});

		try {
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
		} catch (error: any) {
			const paystackMessage = error.response?.data?.message || error.message;
			throw new Error(`Paystack transfer error: ${paystackMessage}`);
		}
	}
}
