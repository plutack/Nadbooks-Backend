import { BadRequestException, Injectable } from '@nestjs/common';
import {
	PaymentMethod,
	TransactionStatus,
	TransactionType,
} from 'generated/prisma';
import { generateRef } from '@/helpers/functions';
import { PriceFeedService } from '@/price-feed/price-feed.service';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtPayloadType } from '@/types/jwt.type';
import { WalletService } from '@/wallet/wallet.service';
import { TransactionService } from '../shared/transaction.service';
import { VerifyPaymentDto } from './dtos/crypto-deposit.dto';
import { DepositInput } from './dtos/deposit.dto';
import {
	DepositProviderInterface,
	DepositResult,
	PaymentStatus,
} from './interfaces/provider.interface';
import { CryptoDepositProvider } from './providers/crypto-deposit.provider';
import { PaystackDepositProvider } from './providers/paystack-deposit.provider';

type DepositProviderMap = {
	[PaymentMethod.PAYSTACK]: DepositProviderInterface<
		DepositInput,
		DepositResult,
		VerifyPaymentDto,
		{ status: PaymentStatus }
	>;
	[PaymentMethod.CRYPTO]: DepositProviderInterface<
		DepositInput,
		DepositResult,
		VerifyPaymentDto,
		{ status: PaymentStatus }
	>;
};

@Injectable()
export class DepositService {
	private providers: DepositProviderMap;

	constructor(
		private readonly db: PrismaService,
		private readonly walletService: WalletService,
		private readonly priceFeed: PriceFeedService,
		private readonly transactionService: TransactionService,

		private readonly paystackProvider: PaystackDepositProvider,
		private readonly cryptoProvider: CryptoDepositProvider,
	) {
		this.providers = {
			[PaymentMethod.PAYSTACK]: this.paystackProvider,
			[PaymentMethod.CRYPTO]: this.cryptoProvider,
		};
	}

	/** Initiate a deposit */
	async initiateDeposit(user: JwtPayloadType, dto: DepositInput) {
		const provider = this.providers[dto.method];
		if (!provider)
			throw new BadRequestException(
				`Unsupported deposit method: ${dto.method}`,
			);

		const reference = generateRef(TransactionType.DEPOSIT, user.sub);

		await this.transactionService.recordTransaction({
			reference,
			amount: dto.amount,
			type: TransactionType.DEPOSIT,
			paymentMethod: dto.method,
			status: TransactionStatus.PENDING,
		});

		let providerDto: any;
		if (dto.method === PaymentMethod.PAYSTACK) {
			providerDto = {
				amount: dto.amount,
				email: user.email,
				reference,
				metadata: { userId: user.sub },
			};
		} else {
			providerDto = {
				amount: dto.amount,
				hash: dto.hash,
				buyerAddress: user.sub,
			};
		}

		return provider.initiateDeposit(user, providerDto);
	}

	// Verify deposit
	async verifyDeposit(
		method: PaymentMethod,
		input: {
			reference?: string;
			hash?: string;
			buyerAddress?: string;
			amount?: number;
		},
	) {
		const provider = this.providers[method];
		if (!provider)
			throw new BadRequestException(`Unsupported method: ${method}`);

		const result = await provider.verifyPayment(input as any);

		// Update wallet & transaction if successful
		const isSuccess =
			(method === PaymentMethod.PAYSTACK && (result as any).success) ||
			(method === PaymentMethod.CRYPTO &&
				(result as any).status === PaymentStatus.SUCCESS);

		if (isSuccess) {
			const tx = await this.db.transaction.findUnique({
				where: { reference: input.reference || input.hash },
			});
			if (!tx) throw new BadRequestException('Transaction not found');

			if (tx.status === TransactionStatus.PENDING) {
				await this.walletService.credit(tx.recipientWalletId!, tx.amount);
				await this.db.transaction.update({
					where: { id: tx.id },
					data: { status: TransactionStatus.SUCCESS },
				});
			}
		}

		return result;
	}

	/** Handle provider webhook */
	async handleWebhook(
		method: PaymentMethod,
		payload: any,
		headers?: Record<string, string>,
	) {
		const provider = this.providers[method];
		if (!provider || !provider.handleWebhook) return { received: true };

		const event = await provider.handleWebhook(payload, headers);
		if (!event?.data?.reference) return { received: true };

		const tx = await this.db.transaction.findUnique({
			where: { reference: event.data.reference },
		});
		if (!tx) return { received: true };

		if (
			event.event === 'charge.success' &&
			tx.status === TransactionStatus.PENDING
		) {
			await this.walletService.credit(tx.recipientWalletId!, tx.amount);
			await this.db.transaction.update({
				where: { id: tx.id },
				data: { status: TransactionStatus.SUCCESS },
			});
		}

		return { received: true };
	}
}
