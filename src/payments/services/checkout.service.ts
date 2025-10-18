import { Injectable, Logger } from '@nestjs/common';
import { TransactionStatus, TransactionType } from 'generated/prisma';
import { PriceFeedService } from '@/price-feed/price-feed.service';
import { JwtPayloadType } from '@/types/jwt.type';
import {
	IPaystackEvent,
	PaystackEvent,
	WebhookEvent,
} from '@/types/payment.type';
import { DepositDto } from '@/wallet/dtos/wallet.dto';
import { WalletService } from '@/wallet/wallet.service';
import { CreateCheckoutDto } from '../dtos/checkout.dto';
import { PaymentService } from '../payment.service';
import { OrderService } from './order.service';
import { TransactionService } from './transaction.service';

@Injectable()
export class CheckoutService {
	constructor(
		private readonly logger = new Logger(CheckoutService.name),
		private readonly orderService: OrderService,
		private readonly transactionService: TransactionService,
		private readonly paymentService: PaymentService,
		private readonly walletService: WalletService,
		private readonly priceFeedService: PriceFeedService,
	) {}

	async createOrderCheckout(user: JwtPayloadType, dto: CreateCheckoutDto) {
		//  Create the order
		const order = await this.orderService.createOrder(user.sub, dto.bookIds);

		//  Initiate transaction record (PENDING)
		const transaction = await this.transactionService.recordTransaction({
			orderId: order.id,
			amount: order.totalAmount,
			method: dto.paymentMethod,
			type: 'ORDER',
		});

		const transactionDetails = {
			transactionId: transaction.id,
			amount: Number(transaction.amount),
			customer: { id: user.sub, email: user.email },
		};
		const providerResponse = await this.paymentService.makeDeposit(
			transactionDetails,
			dto.paymentMethod,
		);

		//  Update transaction with provider response
		await this.transactionService.updateTransaction(transaction.id, {
			providerReference: providerResponse.reference,
		});

		// Return what frontend needs
		return {
			orderId: order.id,
			transactionId: transaction.id,
			paymentUrl: providerResponse.paymentUrl,
		};
	}
	async createDepositCheckout(user: JwtPayloadType, dto: DepositDto) {
		const wallet = await this.walletService.getWallet(user.sub);
		//  Initiate transaction record (PENDING)
		const transaction = await this.transactionService.recordTransaction({
			recipientWalletId: wallet.id,
			amount: dto.amount,
			method: dto.paymentMethod,
			type: 'DEPOSIT',
		});

		const transactionDetails = {
			transactionId: transaction.id,
			amount: Number(transaction.amount),
			customer: { id: user.sub, email: user.email },
		};
		const providerResponse = await this.paymentService.makeDeposit(
			transactionDetails,
			dto.paymentMethod,
		);

		//  Update transaction with provider response
		await this.transactionService.updateTransaction(transaction.id, {
			providerReference: providerResponse.reference,
		});

		// Return what frontend needs
		return {
			transactionId: transaction.id,
			paymentUrl: providerResponse.paymentUrl,
		};
	}

	async verifyPayment(reference: string, provider: string) {
		const verificationDetails = await this.paymentService.verifyTransaction(
			reference,
			provider,
		);

		if (verificationDetails.status === 'success') {
			const transaction =
				await this.transactionService.getTransactionByReference(reference);
			await this.handleSuccessfulPayment(transaction.id);
		}

		return verificationDetails;
	}

	async handleWebhook(payload: any, headers: any, provider: string) {
		try {
			// Let payment service validate and normalize the webhook
			const event: WebhookEvent = await this.paymentService.handleWebhook(
				payload,
				headers,
				provider,
			);
			const reference = event.data?.reference;

			if (!reference) {
				this.logger.warn(`Webhook received without reference: ${event.event}`);
				return;
			}

			switch (event.event) {
				case 'charge.success': {
					const transaction =
						await this.transactionService.getTransactionByReference(reference);
					if (!transaction) {
						this.logger.warn(`No transaction for reference ${reference}`);
						return;
					}

					await this.handleSuccessfulPayment(transaction.id);

					break;
				}

				// --- SYSTEM SENT FIAT -> WITHDRAWAL SUCCESS ---
				case 'transfer.success': {
					await this.transactionService.updateTransactionByReference(
						reference,
						{
							status: TransactionStatus.SUCCESS,
						},
					);
					break;
				}

				// --- SYSTEM ATTEMPTED TRANSFER -> FAILED, REFUND TOKENS ---
				case 'transfer.failed': {
					const transaction =
						await this.transactionService.getTransactionByReference(reference);
					if (!transaction) return;

					await this.transactionService.updateTransaction(transaction.id, {
						status: TransactionStatus.FAILED,
					});

					await this.walletService.credit(
						transaction.userId,
						transaction.amount,
						'Withdrawal refund (failed Paystack transfer)',
						transaction.id,
					);
					break;
				}

				default:
					this.logger.log(`Unhandled Paystack event: ${event.event}`);
			}
		} catch (err: unknown) {
			this.logger.error('Webhook processing failed', err);
		}
	}

	private async handleSuccessfulPayment(reference: string) {
		const transaction =
			await this.transactionService.getTransactionByReference(reference);

		// check if processed already
		if (transaction.status === TransactionStatus.SUCCESS) {
			this.logger.log(`Transaction ${transaction.id} already processed.`);
			return transaction;
		}

		await this.transactionService.updateTransaction(reference, {
			status: TransactionStatus.SUCCESS,
		});

		if (transaction.type === TransactionType.ORDER) {
			const order = await this.orderService.getOrder(transaction.orderId);
			const booksAmount = await this.priceFeedService.convertNgnToBooks(
				transaction.amount,
			);

			await this.walletService.credit(
				order.userId,
				booksAmount,
				`Deposit for order ${order.id}`,
				transaction.id,
			);
		} else if (transaction.type === TransactionType.DEPOSIT) {
			const wallet = await this.walletService.getWalletByWalletId(
				transaction.recipientWalletId,
			);
			await this.walletService.credit(
				wallet.userId,
				transaction.amount,
				'Wallet deposit',
				transaction.id,
			);
		}

		return transaction;
	}
}
