import { Injectable } from '@nestjs/common';
import { PaystackService } from '@/payments/providers/paystack.provider';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateCheckoutDto } from '../dtos/checkout.dto';
import { JwtPayloadType } from '@/types/jwt.type';
import { OrderService } from './order.service';
import { PaymentProvider } from '../interfaces/payment.interface';
import { TransactionService } from './transaction.service';
import { PaymentService } from '../payment.service';
import { TransactionStatus } from 'generated/prisma';

@Injectable()
export class CheckoutService {
	constructor(
		private readonly orderService: OrderService,
		private readonly transactionService: TransactionService,
		private readonly paymentService: PaymentService,
	) {}

	async createCheckout(user: JwtPayloadType, dto: CreateCheckoutDto) {
		//  Create the order
		const order = await this.orderService.createOrder(user.sub, dto.bookIds);

		//  Initiate transaction record (PENDING)
		const transaction = await this.transactionService.recordTransaction({
			orderId: order.id,
			amount: order.totalAmount,
			method: dto.paymentMethod,
		});

		const transactionDetails = {
			transactionId: transaction.id,
			amount: transaction.amount,
			customer: { id: user.sub, email: user.email },
			metadata: { orderId: order.id },
		};
		const providerResponse = await this.paymentService.startPayment(
			transaction,
			dto.paymentMethod,
		);

		// 4. Update transaction with provider response
		await this.transactionService.updateTransaction(transaction.id, {
			providerReference: providerResponse.reference,
		});

		// Return what frontend needs (e.g. payment link / reference)
		return {
			orderId: order.id,
			transactionId: transaction.id,
			paymentUrl: providerResponse.paymentUrl,
		};
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
