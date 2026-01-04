import { Injectable } from '@nestjs/common';
import {
	TransactionType,
	TransactionStatus,
	PaymentMethod,
} from 'generated/prisma';
import { PrismaService } from '@/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { OrderService } from '../shared/order.service';
import { TransactionService } from '../shared/transaction.service';
import { WalletService } from '@/wallet/wallet.service';
import { JwtPayloadType } from '@/types/jwt.type';
import { CreateCheckoutDto } from '@/payments/order-payment/dtos/checkout.dto';
import { generateRef } from '@/helpers/functions';

@Injectable()
export class OrderPaymentService {
	constructor(
		private readonly db: PrismaService,
		private readonly orderService: OrderService,
		private readonly transactionService: TransactionService,
		private readonly walletService: WalletService,
	) {}

	async createOrderCheckout(user: JwtPayloadType, dto: CreateCheckoutDto) {
		return await this.db.$transaction(async (tx) => {
			const order = await this.orderService.createOrder(
				user.sub,
				dto.bookIds,
				tx,
			);

			const reference = generateRef(TransactionType.ORDER, user.sub);

			const transaction = await this.transactionService.recordTransaction(
				{
					orderId: order.id,
					amount: new Decimal(order.totalAmount),
					type: TransactionType.ORDER,
					reference,
					paymentMethod: PaymentMethod.WALLET,
					status: TransactionStatus.PENDING,
				},
				tx,
			);

			await this.walletService.debit(
				user.sub,
				new Decimal(order.totalAmount),
				tx,
			);

			const grouped = await tx.orderBook.groupBy({
				by: ['authorId'],
				where: { orderId: order.id },
				_sum: { price: true },
			});

			for (const entry of grouped) {
				const income = new Decimal(entry._sum.price ?? 0);
				await this.walletService.credit(entry.authorId, income, tx);
			}

			await this.orderService.markAsPaid(order.id, tx);

			await this.transactionService.updateTransaction(transaction.id, {
				status: TransactionStatus.SUCCESS,
			});

			return {
				orderId: order.id,
				transactionId: transaction.id,
			};
		});
	}
}
