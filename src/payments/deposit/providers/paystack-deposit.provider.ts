import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import { TransactionType } from 'generated/prisma';
import { lastValueFrom } from 'rxjs';
import { generateRef } from '@/helpers/functions';
import {
	DepositInput,
	VerifyDepositInput,
} from '@/payments/deposit/dtos/deposit.dto';
import {
	DepositProviderInterface,
	DepositResult,
	PaymentStatus,
} from '@/payments/deposit/interfaces/provider.interface';
import { JwtPayloadType } from '@/types/jwt.type';

@Injectable()
export class PaystackDepositProvider
	implements
		DepositProviderInterface<
			DepositInput,
			DepositResult,
			VerifyDepositInput,
			{ status: PaymentStatus }
		>
{
	private readonly PAYSTACK_BASE = 'https://api.paystack.co';
	private readonly secretKey: string;

	constructor(
		private readonly http: HttpService,
		private readonly config: ConfigService,
	) {
		this.secretKey = this.config.get<string>('PAYSTACK_SECRET_KEY', '');
		if (!this.secretKey) throw new Error('PAYSTACK_SECRET_KEY is not set');
	}

	async initiateDeposit(
		user: JwtPayloadType,
		dto: DepositInput,
	): Promise<DepositResult> {
		const url = `${this.PAYSTACK_BASE}/transaction/initialize`;
		const reference = generateRef(TransactionType.DEPOSIT, user.sub);
		const response = await lastValueFrom(
			this.http.post(
				url,
				{
					amount: dto.amount,
					email: dto.email,
					reference,
					metadata: dto.metadata,
				},
				{ headers: { Authorization: `Bearer ${this.secretKey}` } },
			),
		);

		const data = response.data?.data;

		return {
			status: PaymentStatus.PENDING,
			reference: data.reference,
			paymentUrl: data.authorization_url,
		};
	}

	async verifyPayment(
		dto: VerifyDepositInput,
	): Promise<{ status: PaymentStatus }> {
		const url = `${this.PAYSTACK_BASE}/transaction/verify/${dto.reference}`;

		const response = await lastValueFrom(
			this.http.get(url, {
				headers: { Authorization: `Bearer ${this.secretKey}` },
			}),
		);

		const status = response.data?.data?.status;

		let responseStatus: PaymentStatus;

		if (status === 'success') {
			responseStatus = PaymentStatus.SUCCESS;
		} else if (status === 'pending') {
			responseStatus = PaymentStatus.PENDING;
		} else {
			responseStatus = PaymentStatus.FAILED;
		}

		return { status: responseStatus };
	}

	handleWebhook(payload: any, headers: Record<string, string>) {
		const signature = headers['x-paystack-signature'];

		const hash = crypto
			.createHmac('sha512', this.secretKey)
			.update(JSON.stringify(payload))
			.digest('hex');

		if (hash !== signature) throw new Error('Invalid webhook signature');

		return payload;
	}
}
