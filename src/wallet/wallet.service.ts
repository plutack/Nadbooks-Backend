import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma, TransactionStatus, TransactionType } from 'generated/prisma';
import { PaymentService } from '@/payments/payment.service';
import { TransactionService } from '@/payments/services/transaction.service';
import { PriceFeedService } from '@/price-feed/price-feed.service';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtPayloadType } from '@/types/jwt.type';
import { DepositDto, WithdrawDto } from './dtos/wallet.dto';

@Injectable()
export class WalletService {
	constructor(
		private readonly logger = new Logger(WalletService.name),
		private db: PrismaService,
		private paymentService: PaymentService,
		private readonly priceFeedService: PriceFeedService,
		private readonly transactionService: TransactionService,
	) {}

	async deposit(user: JwtPayloadType, depositDto: DepositDto) {
		const transaction = await this.transactionService.recordTransaction({
			amount: depositDto.amount,
			method: depositDto.paymentMethod,
			type: 'DEPOSIT',
		});

		const transactionDetails = {
			transactionId: transaction.id,
			amount: new Decimal(transaction.amount).toNumber(),
			customer: { id: user.sub, email: user.email },
		};

		const providerResponse = await this.paymentService.makeDeposit(
			transactionDetails,
			depositDto.paymentMethod,
		);

		await this.transactionService.updateTransaction(transaction.id, {
			reference: providerResponse.reference,
		});

		return providerResponse;
	}

	async createWallet(userId: string) {
		return await this.db.wallet.create({
			data: {
				userId,
			},
		});
	}

	// NOTE: we should probably properly annotate this as private methods
	async getWallet(userId: string) {
		const wallet = await this.db.wallet.findUnique({
			where: { userId },
		});

		if (!wallet) {
			throw new NotFoundException('Wallet not found');
		}

		return wallet;
	}

	async getWalletByWalletId(walletId: string) {
		const wallet = await this.db.wallet.findUnique({
			where: { id: walletId },
		});

		if (!wallet) {
			throw new NotFoundException('Wallet not found');
		}

		return wallet;
	}

	async credit(
		userId: string,
		amount: Decimal,
		description: string,
		reference: string,
		metadata?: Prisma.NullableJsonNullValueInput,
	) {
		if (amount.lessThanOrEqualTo(0)) {
			throw new BadRequestException('Amount must be greater than zero');
		}

		return await this.db.$transaction(async (tx) => {
			const wallet = await tx.wallet.findUnique({
				where: { userId },
			});

			if (!wallet) {
				throw new NotFoundException('Wallet not found');
			}

			const updatedWallet = await tx.wallet.update({
				where: { id: wallet.id },
				data: { balance: { increment: amount } },
			});

			await tx.transaction.create({
				data: {
					type: TransactionType.DEPOSIT,
					amount,
					recipientWalletId: wallet.id,
					reference,
					status: TransactionStatus.SUCCESS,
					description,
					metadata,
				},
			});

			return updatedWallet;
		});
	}

	async debit(
		userId: string,
		amount: Decimal,
		description: string,
		reference: string,
		metadata?: Prisma.NullableJsonNullValueInput,
	) {
		if (amount.lessThanOrEqualTo(0)) {
			throw new BadRequestException('Amount must be greater than zero');
		}

		return await this.db.$transaction(async (tx) => {
			const wallet = await tx.wallet.findUnique({
				where: { userId },
			});

			if (!wallet) {
				throw new NotFoundException('Wallet not found');
			}

			if (wallet.balance < amount) {
				throw new BadRequestException('Insufficient balance');
			}

			const updatedWallet = await tx.wallet.update({
				where: { id: wallet.id },
				data: { balance: { decrement: amount } },
			});

			return updatedWallet;
		});
	}

	async transfer(
		senderId: string,
		recipientId: string,
		amount: Decimal,
		description: string,
		reference: string,
	) {
		if (amount.lessThanOrEqualTo(0)) {
			throw new BadRequestException('Amount must be greater than zero');
		}

		try {
			return await this.db.$transaction(async (tx) => {
				const senderWallet = await tx.wallet.findUnique({
					where: { userId: senderId },
				});
				if (!senderWallet)
					throw new BadRequestException('Sender wallet not found');
				if (senderWallet.balance < amount)
					throw new BadRequestException('Insufficient balance');

				const recipientWallet = await tx.wallet.findUnique({
					where: { userId: recipientId },
				});
				if (!recipientWallet)
					throw new BadRequestException('Recipient wallet not found');

				await tx.wallet.update({
					where: { id: senderWallet.id },
					data: { balance: { decrement: amount } },
				});

				await tx.wallet.update({
					where: { id: recipientWallet.id },
					data: { balance: { increment: amount } },
				});

				await tx.transaction.create({
					data: {
						type: TransactionType.ORDER,
						amount,
						senderWalletId: senderWallet.id,
						recipientWalletId: recipientWallet.id,
						reference,
						status: TransactionStatus.SUCCESS,
						description,
					},
				});

				return { success: true };
			});
		} catch (error: any) {
			if (error instanceof BadRequestException) {
				// These come from our manual checks inside the transaction
				throw error;
			}

			this.logger.error(
				`Transfer failed: ${error?.message ?? 'Unknown error'}`,
				error?.stack,
			);
		}
	}
	// Placeholder for crypto withdrawal. this should not be here
	cryptoWithdrawal(userId: string, amount: Decimal, address: string) {
		// NOTE: call crypto api here
		// 1. Debit the user's wallet
		// 2. Call the crypto microservice to process the withdrawal
		// 3. Update the transaction status based on the response
		console.log(
			`Initiating crypto withdrawal for user ${userId} of ${amount} BOOKS to ${address}`,
		);
		return { success: true, message: 'Crypto withdrawal initiated' };
	}

	async getWithdrawalPreview(amount: number) {
		const amountInBooks = new Decimal(amount);
		const amountInNgn =
			await this.priceFeedService.convertBooksToNgn(amountInBooks);

		return {
			amountInBooks,
			amountInNgn,
		};
	}

	async withdraw(user: JwtPayloadType, dto: WithdrawDto) {
		const amountInBooks = new Decimal(dto.amount);
		const amountInNgn =
			await this.priceFeedService.convertBooksToNgn(amountInBooks);

		const wallet = await this.getWallet(user.sub);

		if (wallet.balance < amountInBooks) {
			throw new BadRequestException('Insufficient balance');
		}

		const transaction = await this.transactionService.recordTransaction({
			amount: amountInNgn,
			method: 'PAYSTACK',
			type: 'WITHDRAWAL',
			senderWalletId: wallet.id,
			userId: user.sub,
		});

		const providerResponse = await this.paymentService.withdrawFunds(
			{
				amount: amountInNgn.toNumber(),
				reason: `Withdrawal of ${amountInBooks} BOOKS`,
				accountNumber: dto.accountNumber,
				bankCode: dto.bankCode,
				name: `${user.firstName} ${user.lastName}`,
			},
			'PAYSTACK',
		);

		await this.transactionService.updateTransaction(transaction.id, {
			reference: providerResponse.reference,
		});

		await this.debit(
			user.sub,
			amountInBooks,
			`Withdrawal of ${amountInBooks} BOOKS`,
			providerResponse.reference,
			{
				accountNumber: dto.accountNumber,
				bankCode: dto.bankCode,
				amountInNgn,
			},
		);

		return { success: true, message: 'Withdrawal initiated' };
	}
}
