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

	async startPayment(
		transaction: { id: string; amount: number },
		method: string,
	) {
		const provider = this.providers[method];
		if (!provider) {
			throw new BadRequestException(`Unsupported payment method: ${method}`);
		}

		return await provider.initiatePayment(transaction);
	}

	async verifyPayment(reference: string, method: string) {
		const provider = this.providers[method];
		if (!provider)
			throw new BadRequestException(`Unsupported payment method: ${method}`);

		return provider.verifyPayment(reference);
	}

	async handleWebhook(payload: any, headers: any, method: string) {
		const provider = this.providers[method];
		if (!provider)
			throw new BadRequestException(`Unsupported payment method: ${method}`);

		return provider.handleWebhook(payload, headers);
	}
}
