import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import {
	PaystackDepositDto,
	VerifyDepositInput,
} from '@/payments/deposit/dtos/deposit.dto';
import {
	DepositProviderInterface,
	DepositResult,
	PaymentStatus,
} from '@/payments/deposit/interfaces/provider.interface';

@Injectable()
export class PaystackDepositProvider
	implements
		DepositProviderInterface<
			PaystackDepositDto,
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
		this.secretKey = this.config.get<string>('PAYSTACK_SECRET', '');
		if (!this.secretKey) throw new Error('PAYSTACK_SECRET is not set');
	}

	async initiateDeposit(dto: PaystackDepositDto): Promise<DepositResult> {
		const url = `${this.PAYSTACK_BASE}/transaction/initialize`;
		console.log('provider level: ', dto);
		const response = await lastValueFrom(
			this.http.post(
				url,
				{
					amount: dto.amount,
					email: dto.email,
					reference: dto.reference,
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
}
