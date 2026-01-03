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
import { PaystackDepositProvider } from '../deposit/providers/paystack-deposit.provider';
import { CryptoDepositProvider } from '../deposit/providers/crypto-deposit.provider';
import { PaystackDepositDto } from '../deposit/dtos/deposit.dto';

@Injectable()
export class OrderPaymentService {
	constructor(
		private readonly db: PrismaService,
		private readonly orderService: OrderService,
		private readonly transactionService: TransactionService,
		private readonly walletService: WalletService,
		private readonly paystackProvider: PaystackDepositProvider,
		private readonly cryptoProvider: CryptoDepositProvider,
	) {}

	async createOrderCheckout(user: JwtPayloadType, dto: CreateCheckoutDto) {
		// Step 1: Prepare DB State (Atomic)
		const result = await this.db.$transaction(async (tx) => {
			let order;

			// Scenario 1: Paying for an existing order
			if (dto.orderId) {
				order = await this.orderService.getOrderById(dto.orderId);

				// Security check: Ensure user owns the order
				if (order.userId !== user.sub) {
					throw new Error('Order not found');
				}

				if (order.status === TransactionStatus.SUCCESS) {
					throw new Error('Order is already paid');
				}
			}
			// Scenario 2: creating a new order
			else if (dto.bookIds && dto.bookIds.length > 0) {
				order = await this.orderService.createOrder(user.sub, dto.bookIds, tx);
			} else {
				throw new Error('Invalid request: Provide either orderId or bookIds');
			}

			const reference = generateRef(TransactionType.ORDER, user.sub);

			const transaction = await this.transactionService.recordTransaction(
				{
					orderId: order.id,
					amount: new Decimal(order.totalAmount),
					type: TransactionType.ORDER,
					reference,
					paymentMethod: dto.paymentMethod,
					status: TransactionStatus.PENDING,
				},
				tx,
			);

			// Handle WALLET payment within the transaction (Atomic)
			if (dto.paymentMethod === PaymentMethod.WALLET) {
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
					type: 'WALLET_SUCCESS' as const,
					data: {
						orderId: order.id,
						transactionId: transaction.id,
						status: 'PAID',
					},
				};
			}

			// For External payments, just return the identifiers to process outside TX
			return {
				type: 'EXTERNAL_INIT' as const,
				data: {
					order,
					transaction,
					reference,
				},
			};
		});

		// Step 2: Handle External Calls (Non-Blocking for DB)
		if (result.type === 'WALLET_SUCCESS') {
			return result.data;
		}

		if (result.type === 'EXTERNAL_INIT') {
			const { order, reference, transaction } = result.data;

			if (dto.paymentMethod === PaymentMethod.PAYSTACK) {
				const providerDto: PaystackDepositDto = {
					amount: Number(order.totalAmount),
					email: user.email!,
					reference,
					metadata: {
						userId: user.sub,
						orderId: order.id,
						type: TransactionType.ORDER,
					},
				};
				// HTTP call happens here, safe from DB locks
				try {
					return await this.paystackProvider.initiateDeposit(providerDto);
				} catch (error) {
					await this.transactionService.updateTransaction(transaction.id, {
						status: TransactionStatus.FAILED,
					});
					throw error;
				}
			} else if (dto.paymentMethod === PaymentMethod.CRYPTO) {
				return {
					status: 'PENDING',
					reference,
					amount: Number(order.totalAmount),
					message: 'Please transfer the exact amount to the central wallet.',
				};
			}
		}

		throw new Error('Unsupported payment method');
	}
}
