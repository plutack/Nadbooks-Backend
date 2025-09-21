import { Injectable } from '@nestjs/common';
import { PaystackService } from '@/payments/providers/paystack.provider';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class CheckoutService {
	constructor(
		private readonly paystack: PaystackService,
		private readonly db: PrismaService,
	) {}

	async createPayment(orderId: string, provider: string) {
		const order = await this.db.order.findUnique({
			where: { id: orderId },
			include: { user: true, books: { include: { book: true } } },
		});

		if (!order) throw new Error('Order not found');

		const amount = order.totalAmount;
		const email = order.user.email;

		switch (provider) {
			case 'paystack':
				return this.paystack.createPaymentReference({ amount, email });
		}
	}

	async verifyPayment(reference: string, provider: string) {
		switch (provider) {
			case 'paystack':
				return await this.paystack.verifyPayment(reference);
		}
	}

	handleWebhook(payload: any, headers: any, provider: string) {
		switch (provider) {
			case 'paystack':
				return this.paystack.handleWebhook(payload, headers);
		}
	}
}
