import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma, TransactionStatus, TransactionType } from 'generated/prisma';
import { PaymentSucceededEvent } from '@/payments/events/payment.events';
import { PayoutFailedEvent } from '@/payments/events/payout.failed.event';
import { PayoutSucceededEvent } from '@/payments/events/payout.succeeded.event';
import { PrismaService } from '@/prisma/prisma.service';
import { WalletService } from '@/wallet/wallet.service';

@Injectable()
export class TransactionService {
	constructor(
		private readonly db: PrismaService,
		private readonly walletService: WalletService,
	) {}

	private getClient(tx?: Prisma.TransactionClient) {
		return tx ?? this.db;
	}

	async recordTransaction(
		data: Prisma.TransactionUncheckedCreateInput,
		tx?: Prisma.TransactionClient,
	) {
		const client = this.getClient(tx);
		return await client.transaction.create({ data });
	}

	async getTransactionByReference(reference: string) {
		const transaction = await this.db.transaction.findUnique({
			where: { reference },
			include: { recipientWallet: true, senderWallet: true },
		});

		if (!transaction) {
			throw new NotFoundException('Transaction not found');
		}

		return transaction;
	}

	async getTransactionById(id: string) {
		const transaction = await this.db.transaction.findUnique({
			where: { id },
			include: { recipientWallet: true, senderWallet: true },
		});

		if (!transaction) {
			throw new NotFoundException('Transaction not found');
		}

		return transaction;
	}
	async updateTransactionByReference(
		reference: string,
		data: Prisma.TransactionUpdateInput,
	) {
		return await this.db.transaction.update({
			where: { reference },
			data,
		});
	}

	async updateTransaction(
		id: string,
		data: Prisma.TransactionUpdateInput,
		tx?: Prisma.TransactionClient,
	) {
		const client = tx ?? this.db;
		return await client.transaction.update({
			where: { id },
			data,
		});
	}

	@OnEvent('payment.succeeded')
	async handlePaymentSucceeded(payload: PaymentSucceededEvent) {
		console.log('TransactionService handling payment.succeeded', payload);

		try {
			// Use a database transaction to ensure atomicity
			const result = await this.db.$transaction(async (tx) => {
				// 'tx' is a transaction-aware Prisma client instance

				// Step 1: Update the transaction record to 'COMPLETED'
				const updatedTransaction = await this.updateTransaction(
					payload.transactionId,
					{
						status: TransactionStatus.SUCCESS,
					},
					tx,
				);

				if (!updatedTransaction) {
					throw new Error('Transaction record not found.');
				}

				const wallet = await this.walletService.getWallet(payload.userId, tx);

				// Step 2: Credit the user's wallet
				// The WalletService method must also use the transactional client `tx`
				const updatedWallet = await this.walletService.credit(
					wallet.userId,
					updatedTransaction.amount,
					tx, // Pass the transaction client to the service method
				);

				return { updatedTransaction, updatedWallet };
			});

			console.log('Successfully updated transaction and credited wallet.', result);
		} catch (error) {
			console.error(
				'Failed to process successful payment event. Rolling back.',
				error,
			);
			// Here you could emit another event like 'payment.processing.failed'
			// for monitoring or alerting purposes.
		}
	}

	@OnEvent('payout.succeeded')
	async handlePayoutSucceeded(payload: PayoutSucceededEvent) {
		console.log('TransactionService handling payout.succeeded', payload);

		try {
			const result = await this.db.$transaction(async (tx) => {
				const updatedTransaction = await this.updateTransaction(
					payload.withdrawalId,
					{
						status: TransactionStatus.SUCCESS,
					},
					tx,
				);

				if (!updatedTransaction) {
					throw new Error('Withdrawal transaction record not found.');
				}
				return { updatedTransaction };
			});
			console.log('Successfully updated withdrawal transaction.', result);
		} catch (error) {
			console.error(
				'Failed to process successful payout event. Rolling back.',
				error,
			);
		}
	}

	@OnEvent('payout.failed')
	async handlePayoutFailed(payload: PayoutFailedEvent) {
		console.log('TransactionService handling payout.failed', payload);

		try {
			const result = await this.db.$transaction(async (tx) => {
				const updatedTransaction = await this.updateTransaction(
					payload.withdrawalId,
					{
						status: TransactionStatus.FAILED,
						reason: payload.reason,
					},
					tx,
				);

				if (!updatedTransaction) {
					throw new Error('Withdrawal transaction record not found.');
				}

				// Credit the user's wallet back (compensating transaction)
				const wallet = await this.walletService.getWallet(payload.userId, tx);
				const creditedWallet = await this.walletService.credit(
					wallet.userId,
					updatedTransaction.amount,
					tx,
				);

				return { updatedTransaction, creditedWallet };
			});
			console.log('Successfully updated failed withdrawal and credited wallet.', result);
		} catch (error) {
			console.error(
				'Failed to process failed payout event. Rolling back.',
				error,
			);
		}
	}
}
