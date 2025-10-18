import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentProvider } from './interfaces/payment.interface';
import { PaystackProvider } from './providers/paystack.provider';

@Injectable()
export class PaymentService {
	private readonly providers: Record<string, PaymentProvider>;

	constructor(private readonly paystack: PaystackProvider) {
		this.providers = {
			PAYSTACK: this.paystack,
		};
	}

	async makeDeposit(
		transaction: {
			transactionId: string;
			amount: number;
			customer: {
				id: string;
				email?: string;
			};
		},
		method: string,
	) {
		const provider = this.providers[method];
		if (!provider) {
			throw new BadRequestException(`Unsupported payment method: ${method}`);
		}

		return await provider.initiatePayment(transaction);
	}

	verifyTransaction(reference: string, method: string) {
		const provider = this.providers[method];
		if (!provider)
			throw new BadRequestException(`Unsupported payment method: ${method}`);

		return provider.verifyPayment(reference);
	}

	async withdrawFunds(
		transaction: {
			amount: number;
			reason: string;
			accountNumber: string;
			bankCode: string;
			name: string;
		},
		method: string,
	) {
		const provider = this.providers[method];
		if (!provider) {
			throw new BadRequestException(`Unsupported payment method: ${method}`);
		}

		return await provider.initiateTransfer(transaction);
	}
	handleWebhook(payload: any, headers: any, method: string) {
		const provider = this.providers[method];
		if (!provider)
			throw new BadRequestException(`Unsupported payment method: ${method}`);

		return provider.handleWebhook(payload, headers);
	}
}
