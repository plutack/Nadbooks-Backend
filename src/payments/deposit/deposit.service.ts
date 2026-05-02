import { BadRequestException, Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import {
	PaymentMethod,
	Transaction,
	TransactionStatus,
	TransactionType,
} from 'generated/prisma';
import { generateRef } from '@/helpers/functions';
import {
	CryptoDepositDto,
	DepositDto,
	PaystackDepositDto,
	VerifyDepositInput,
} from '@/payments/deposit/dtos/deposit.dto';
import {
	CryptoDepositProviderInterface,
	PaymentStatus,
	PaystackDepositProviderInterface,
} from '@/payments/deposit/interfaces/provider.interface';
import { CryptoDepositProvider } from '@/payments/deposit/providers/crypto-deposit.provider';
import { PaystackDepositProvider } from '@/payments/deposit/providers/paystack-deposit.provider';
import { PriceFeedService } from '@/price-feed/price-feed.service';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtPayloadType } from '@/types/jwt.type';
import { WalletService } from '@/wallet/wallet.service';
import { TransactionService } from '../shared/transaction.service';

type DepositProviderMap = {
	[PaymentMethod.PAYSTACK]: PaystackDepositProviderInterface;
	[PaymentMethod.CRYPTO]: CryptoDepositProviderInterface;
};

@Injectable()
export class DepositService {
	providers: DepositProviderMap;

	constructor(
		private readonly db: PrismaService,
		private readonly walletService: WalletService,
		private readonly transactionService: TransactionService,
		private readonly priceFeedService: PriceFeedService,

		paystackProvider: PaystackDepositProvider,
		cryptoProvider: CryptoDepositProvider,
	) {
		this.providers = {
			[PaymentMethod.PAYSTACK]: paystackProvider,
			[PaymentMethod.CRYPTO]: cryptoProvider,
		};
	}

	/** Initiate a deposit */
	async initiateDeposit(user: JwtPayloadType, dto: DepositDto) {
		const provider = this.providers[dto.method];
		if (!provider)
			throw new BadRequestException(
				`Unsupported deposit method: ${dto.method}`,
			);

		const reference = generateRef(TransactionType.DEPOSIT, user.sub);

		const wallet = await this.walletService.getWallet(user.sub);

		const metadata =
			dto.method === PaymentMethod.CRYPTO && dto.address
				? { senderAddress: dto.address }
				: undefined;

		const tx = await this.transactionService.recordTransaction({
			reference,
			amount: dto.amount,
			type: TransactionType.DEPOSIT,
			paymentMethod: dto.method,
			status: TransactionStatus.PENDING,
			recipientWalletId: wallet.id,
			hash: dto.hash,
			metadata,
		});

		console.log('tx saved:', tx);
		let providerDto: any;
		if (dto.method === PaymentMethod.PAYSTACK) {
			providerDto = {
				amount: dto.amount,
				email: user.email,
				reference,
				metadata: { userId: user.sub },
			} as PaystackDepositDto;
		} else {
			providerDto = {
				amount: dto.amount,
				reference,
				address: user.sub,
			} as CryptoDepositDto;
		}

		return provider.initiateDeposit(providerDto);
	}

	// Verify deposit
	async verifyDeposit(method: PaymentMethod, input: VerifyDepositInput) {
		const provider = this.providers[method];
		if (!provider)
			throw new BadRequestException(`Unsupported method: ${method}`);

		let tx: Transaction | null = null;

		if (method === PaymentMethod.CRYPTO) {
			if (!input.hash) {
				throw new BadRequestException(
					'Transaction hash is required for crypto verification',
				);
			}

			console.log('Looking up tx by hash:', input.hash);
			tx = await this.db.transaction.findFirst({
				where: { hash: input.hash },
			});

			if (!tx) {
				console.log(`No transaction found for hash ${input.hash}`);
				return { status: PaymentStatus.FAILED };
			}

			input.transferedAmount = Number(tx.amount);
			input.buyerAddress = (tx.metadata as any)?.senderAddress;
		}

		const result = await provider.verifyPayment(input);

		const isSuccess =
			(method === PaymentMethod.PAYSTACK && (result as any).success) ||
			(method === PaymentMethod.CRYPTO &&
				(result as any).status === PaymentStatus.SUCCESS);

		if (isSuccess) {
			tx = await this.db.transaction.findFirst({
				where: { hash: input.hash },
			});
			if (!tx) throw new BadRequestException('Transaction not found');

			if (tx.status === TransactionStatus.PENDING) {
				const providerRef =
					method === PaymentMethod.CRYPTO
						? input.hash!
						: (result as any).reference || input.hash!;

				if (method === PaymentMethod.CRYPTO) {
					const monAmount = (result as any).decodedAmount as string;
					const { booksAmount, context } =
						await this.priceFeedService.convertMonToBooks(
							new Decimal(monAmount),
						);

					await this.walletService.credit(tx.recipientWalletId!, booksAmount);
					await this.db.transaction.update({
						where: { id: tx.id },
						data: {
							status: TransactionStatus.SUCCESS,
							metadata: {
								...(tx.metadata as object),
								...context,
							},
						},
					});
					console.log(
						`Crypto deposit verified: credited ${booksAmount} BOOKS for ${monAmount} MON (tx ${tx.id})`,
					);
				} else {
					// Paystack: amount is already in NGN/BOOKS equivalent, credit directly
					await this.walletService.credit(tx.recipientWalletId!, tx.amount);
					await this.db.transaction.update({
						where: { id: tx.id },
						data: { status: TransactionStatus.SUCCESS },
					});
					console.log(`Deposit verified and credited for tx ${tx.id}`);
				}
			}
		}

		return result;
	}

	async handleSuccessfulPaystackDeposit(data: any) {
		console.log(data);

		const existing = await this.transactionService.findProviderResponse(
			PaymentMethod.PAYSTACK,
			data.reference,
		);
		if (existing) {
			console.log('Paystack deposit already processed:', data.reference);
			return;
		}

		const txRecord = await this.transactionService.getTransactionByReference(
			data.reference,
		);
		if (!txRecord) return;
		if (txRecord.status !== TransactionStatus.PENDING) return;

		await this.db.$transaction(async (tx) => {
			await this.walletService.credit(
				txRecord.recipientWalletId!,
				txRecord.amount,
				tx,
			);

			await this.transactionService.updateTransaction(
				txRecord.id,
				{ status: TransactionStatus.SUCCESS },
				tx,
			);
		});

		console.log(
			`Deposit successful: ${txRecord.reference}, credited ${txRecord.amount}`,
		);
	}

	async handleFailedPaystackDeposit(data: any) {
		const tx = await this.transactionService.getTransactionByReference(
			data.reference,
		);
		if (!tx) return;
		if (tx.status !== TransactionStatus.PENDING) return;

		await this.transactionService.updateTransaction(tx.id, {
			status: TransactionStatus.FAILED,
		});
	}
}
