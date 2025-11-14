import { BadRequestException, Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import {
	PaymentMethod,
	TransactionStatus,
	TransactionType,
} from 'generated/prisma';
import { generateRef } from '@/helpers/functions';
import { WithdrawDto } from '@/payments/withdrawal/dtos/withdrawal.dto';
import {
	BankWithdrawalProviderInterface,
	CryptoWithdrawalProviderInterface,
} from '@/payments/withdrawal/interfaces/withdrawal-provider.interface';
import { CryptoWithdrawalProvider } from '@/payments/withdrawal/providers/crypto-withdrawal.provider';
import { PaystackWithdrawalProvider } from '@/payments/withdrawal/providers/paystack-withdrawal.provider';
import { PriceFeedService } from '@/price-feed/price-feed.service';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtPayloadType } from '@/types/jwt.type';
import { WalletService } from '@/wallet/wallet.service';
import { TransactionService } from '../shared/transaction.service';

export type ExternalPaymentMethod = Exclude<PaymentMethod, 'WALLET'>;

type WithdrawalProviderMap = {
	[PaymentMethod.CRYPTO]: CryptoWithdrawalProviderInterface;
	[PaymentMethod.PAYSTACK]: BankWithdrawalProviderInterface;
};

@Injectable()
export class WithdrawalService {
	private providers: WithdrawalProviderMap;

	constructor(
		private readonly db: PrismaService,
		private readonly transactionService: TransactionService,
		private readonly walletService: WalletService,
		private readonly priceFeed: PriceFeedService,
		private readonly paystackProvider: PaystackWithdrawalProvider,
		private readonly cryptoProvider: CryptoWithdrawalProvider,
	) {
		this.providers = {
			[PaymentMethod.CRYPTO]: this.cryptoProvider,
			[PaymentMethod.PAYSTACK]: this.paystackProvider,
		};
	}

	async initiateWithdrawal(user: JwtPayloadType, dto: WithdrawDto) {
		const provider = this.providers[dto.method];
		if (!provider) {
			throw new BadRequestException(
				`Unsupported withdrawal method: ${dto.method}`,
			);
		}

		await this.db.$transaction(async (tx) => {
			const wallet = await this.walletService.getWallet(user.sub, tx);
			const booksAmount = new Decimal(dto.amount);

			if (wallet.balance < booksAmount) {
				throw new BadRequestException('Insufficient balance');
			}

			const converted =
				dto.method === PaymentMethod.CRYPTO
					? await this.priceFeed.convertBooksToMon(booksAmount)
					: await this.priceFeed.convertBooksToNgn(booksAmount);

			// Create withdrawal record
			await this.transactionService.recordTransaction(
				{
					amount: converted,
					type: TransactionType.WITHDRAWAL,
					senderWalletId: wallet.id,
					status: TransactionStatus.PENDING,
					paymentMethod: dto.method,
					reference: generateRef(TransactionType.WITHDRAWAL, user.sub),
				},
				tx,
			);

			await this.walletService.debit(user.sub, booksAmount, tx);

			const result = await (() => {
				switch (dto.method) {
					case PaymentMethod.CRYPTO:
						return (
							provider as CryptoWithdrawalProviderInterface
						).initiateWithdrawal({
							amount: converted.toNumber(),
							address: dto.walletAddress!,
						});

					case PaymentMethod.PAYSTACK:
						return (
							provider as BankWithdrawalProviderInterface
						).initiateWithdrawal({
							amount: converted.toNumber(),
							reason: `Withdrawal of ${converted.toNumber()} BOOKS`,
							name: dto.accountName!,
							accountNumber: dto.accountNumber!,
							bankCode: dto.bankCode!,
						});

					default:
						throw new BadRequestException(
							`Unsupported withdrawal method: ${dto.method}`,
						);
				}
			})();

			return result;
		});
	}
}
